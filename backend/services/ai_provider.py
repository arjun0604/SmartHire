import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Type, TypeVar
from dotenv import load_dotenv
from google import genai
from google.genai import types
from groq import Groq
from pydantic import BaseModel

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


def _normalize_strict_json_schema(schema: Any) -> Any:
    if not isinstance(schema, dict):
        return schema
    res = dict(schema)
    if "properties" in res:
        res["additionalProperties"] = False
        res["required"] = list(res["properties"].keys())
    elif res.get("type") == "object":
        res["additionalProperties"] = False
    for k, v in res.items():
        if isinstance(v, dict):
            res[k] = _normalize_strict_json_schema(v)
        elif isinstance(v, list):
            res[k] = [_normalize_strict_json_schema(item) for item in v]
    return res


def get_configured_strategy() -> Tuple[str, str]:
    provider = os.getenv("AI_PRIMARY_PROVIDER", "groq").strip().lower()
    if provider == "groq":
        model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip()
    else:
        provider = "gemini"
        model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip()
    return provider, model


def generate_structured_output(
    prompt: str,
    response_schema: Type[T],
    system_instruction: Optional[str] = None,
    temperature: float = 0.0,
    preferred_provider: Optional[str] = None,
) -> Tuple[T, str, str]:
    strategy_provider, strategy_model = get_configured_strategy()
    active_preferred = (preferred_provider or strategy_provider).strip().lower()

    last_error: Optional[Exception] = None

    if active_preferred == "groq":
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            groq_model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip()
            try:
                client = Groq(api_key=groq_api_key)
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                groq_schema = _normalize_strict_json_schema(response_schema.model_json_schema())
                completion = client.chat.completions.create(
                    model=groq_model,
                    messages=messages,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": response_schema.__name__,
                            "strict": True,
                            "schema": groq_schema,
                        },
                    },
                    temperature=temperature,
                    max_tokens=4096,
                )
                if completion.choices and completion.choices[0].message.content:
                    content = completion.choices[0].message.content
                    validated = response_schema.model_validate_json(content)
                    return validated, "groq", groq_model
            except Exception as e:
                last_error = e
                logger.warning(f"Groq structured generation failed ({type(e).__name__}: {e}). Falling back to Gemini.")

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise last_error or ValueError("Neither Groq nor Gemini API key is configured.")

    configured_gemini = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip()
    candidate_gemini_models: List[str] = [configured_gemini]
    for fb in ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]:
        if fb not in candidate_gemini_models:
            candidate_gemini_models.append(fb)

    gemini_client = genai.Client(api_key=gemini_api_key)
    for model_name in candidate_gemini_models:
        for attempt in range(2):
            try:
                config_kwargs = {
                    "response_mime_type": "application/json",
                    "response_schema": response_schema,
                    "thinking_config": types.ThinkingConfig(thinking_budget=0),
                    "temperature": temperature,
                }
                if system_instruction:
                    config_kwargs["system_instruction"] = system_instruction

                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(**config_kwargs),
                )
                if response.text:
                    validated = response_schema.model_validate_json(response.text)
                    return validated, "gemini", model_name
            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                if (
                    "quota" in err_str
                    or "429" in err_str
                    or "resource_exhausted" in err_str
                    or "not_found" in err_str
                    or "404" in err_str
                ):
                    break
                if attempt < 1:
                    time.sleep(1.0)

    if active_preferred != "groq":
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            groq_model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip()
            try:
                client = Groq(api_key=groq_api_key)
                messages = []
                if system_instruction:
                    messages.append({"role": "system", "content": system_instruction})
                messages.append({"role": "user", "content": prompt})

                groq_schema = _normalize_strict_json_schema(response_schema.model_json_schema())
                completion = client.chat.completions.create(
                    model=groq_model,
                    messages=messages,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": response_schema.__name__,
                            "strict": True,
                            "schema": groq_schema,
                        },
                    },
                    temperature=temperature,
                    max_tokens=4096,
                )
                if completion.choices and completion.choices[0].message.content:
                    content = completion.choices[0].message.content
                    validated = response_schema.model_validate_json(content)
                    return validated, "groq", groq_model
            except Exception as e:
                last_error = e
                logger.warning(f"Secondary Groq attempt failed ({type(e).__name__}: {e}).")

    raise last_error or RuntimeError("All AI structured completion providers failed.")
