DO $$
DECLARE
    v_junk_refs INT;
BEGIN
    SELECT COUNT(*) INTO v_junk_refs
    FROM skills s
    LEFT JOIN candidate_skills cs ON cs.skill_id = s.id
    LEFT JOIN job_skills js ON js.skill_id = s.id
    LEFT JOIN skill_aliases sa ON sa.skill_id = s.id
    WHERE LOWER(TRIM(s.name)) IN ('adsadad', 'sdsd')
      AND (cs.skill_id IS NOT NULL OR js.skill_id IS NOT NULL OR sa.skill_id IS NOT NULL);

    IF v_junk_refs > 0 THEN
        RAISE EXCEPTION 'Unexpected foreign key references found for junk skills adsadad / sdsd: %', v_junk_refs;
    END IF;

    DELETE FROM skills WHERE LOWER(TRIM(name)) IN ('adsadad', 'sdsd');
END $$;

UPDATE skills
SET name = 'IoT'
WHERE LOWER(TRIM(name)) = 'iot and its applications'
  AND NOT EXISTS (SELECT 1 FROM skills WHERE LOWER(TRIM(name)) = 'iot');

UPDATE skills
SET name = 'Large Language Models'
WHERE LOWER(TRIM(name)) = 'llms'
  AND NOT EXISTS (SELECT 1 FROM skills WHERE LOWER(TRIM(name)) = 'large language models');

INSERT INTO skills (name)
SELECT s.name
FROM (
    VALUES
        ('Artificial Intelligence'),
        ('Natural Language Processing'),
        ('MySQL'),
        ('MongoDB'),
        ('GitHub'),
        ('GitLab'),
        ('Azure'),
        ('Django'),
        ('Spring Boot'),
        ('React Native')
) AS s(name)
WHERE NOT EXISTS (
    SELECT 1 FROM skills WHERE LOWER(TRIM(skills.name)) = LOWER(TRIM(s.name))
);

INSERT INTO skill_aliases (skill_id, alias, normalized_alias)
SELECT s.id, a.alias, a.normalized_alias
FROM (
    VALUES
        ('IoT', 'Internet of Things', 'internet of things'),
        ('IoT', 'IoT and its Applications', 'iot and its applications'),
        ('IoT', 'Internet of Things and Applications', 'internet of things and applications'),
        ('IoT', 'Internet of Things (IoT)', 'internet of things (iot)'),
        ('IoT', 'IoT Applications', 'iot applications'),
        ('Object-Oriented Programming (OOP)', 'OOP', 'oop'),
        ('Object-Oriented Programming (OOP)', 'Object Oriented Programming', 'object oriented programming'),
        ('Object-Oriented Programming (OOP)', 'Object Oriented Programming Concepts', 'object oriented programming concepts'),
        ('Object-Oriented Programming (OOP)', 'OOP Concepts', 'oop concepts'),
        ('React', 'React.js', 'react.js'),
        ('React', 'ReactJS', 'reactjs'),
        ('React', 'React JS', 'react js'),
        ('JavaScript', 'JS', 'js'),
        ('JavaScript', 'Javascript', 'javascript'),
        ('JavaScript', 'Java Script', 'java script'),
        ('TypeScript', 'TS', 'ts'),
        ('TypeScript', 'Typescript', 'typescript'),
        ('Node.js', 'Node', 'node'),
        ('Node.js', 'NodeJS', 'nodejs'),
        ('Node.js', 'Node JS', 'node js'),
        ('Next.js', 'NextJS', 'nextjs'),
        ('Next.js', 'Next JS', 'next js'),
        ('PostgreSQL', 'Postgres', 'postgres'),
        ('PostgreSQL', 'Postgre SQL', 'postgre sql'),
        ('PostgreSQL', 'Postgresql', 'postgresql'),
        ('MySQL', 'My SQL', 'my sql'),
        ('MySQL', 'Mysql', 'mysql'),
        ('MongoDB', 'Mongo DB', 'mongo db'),
        ('MongoDB', 'Mongodb', 'mongodb'),
        ('Kubernetes', 'K8s', 'k8s'),
        ('Docker', 'Docker Engine', 'docker engine'),
        ('Git', 'Git SCM', 'git scm'),
        ('Git', 'Git version control', 'git version control'),
        ('GitHub', 'Github', 'github'),
        ('GitLab', 'Git Lab', 'git lab'),
        ('GitLab', 'Gitlab', 'gitlab'),
        ('CI/CD', 'CI CD', 'ci cd'),
        ('CI/CD', 'CICD', 'cicd'),
        ('CI/CD', 'Continuous Integration and Continuous Deployment', 'continuous integration and continuous deployment'),
        ('CI/CD', 'Continuous Integration/Continuous Delivery', 'continuous integration/continuous delivery'),
        ('CI/CD', 'CI/CD Pipeline', 'ci/cd pipeline'),
        ('CI/CD', 'CI / CD', 'ci / cd'),
        ('REST APIs', 'REST API', 'rest api'),
        ('REST APIs', 'RESTful APIs', 'restful apis'),
        ('REST APIs', 'RESTful API', 'restful api'),
        ('Machine Learning', 'ML', 'ml'),
        ('Deep Learning', 'DL', 'dl'),
        ('Artificial Intelligence', 'AI', 'ai'),
        ('Natural Language Processing', 'NLP', 'nlp'),
        ('Computer Vision', 'CV', 'cv'),
        ('Large Language Models', 'LLM', 'llm'),
        ('Large Language Models', 'LLMs', 'llms'),
        ('Large Language Models', 'Large Language Model', 'large language model'),
        ('Python', 'Python3', 'python3'),
        ('Python', 'Python 3', 'python 3'),
        ('AWS', 'Amazon Web Services', 'amazon web services'),
        ('AWS', 'Amazon AWS', 'amazon aws'),
        ('Azure', 'Microsoft Azure', 'microsoft azure'),
        ('Azure', 'MS Azure', 'ms azure'),
        ('Google Cloud Platform', 'GCP', 'gcp'),
        ('Google Cloud Platform', 'Google Cloud', 'google cloud'),
        ('FastAPI', 'Fast API', 'fast api'),
        ('FastAPI', 'FastAPI framework', 'fastapi framework'),
        ('Flask', 'Flask framework', 'flask framework'),
        ('Django', 'Django framework', 'django framework'),
        ('Spring Boot', 'SpringBoot', 'springboot'),
        ('Spring Boot', 'Spring-Boot', 'spring-boot'),
        ('TensorFlow', 'Tensorflow', 'tensorflow'),
        ('TensorFlow', 'TF', 'tf'),
        ('PyTorch', 'Pytorch', 'pytorch'),
        ('Redis', 'Redis cache', 'redis cache'),
        ('SQLite', 'Sqlite', 'sqlite'),
        ('SQLite', 'SQLite3', 'sqlite3'),
        ('SQLAlchemy', 'Sqlalchemy', 'sqlalchemy'),
        ('GraphQL', 'Graph QL', 'graph ql'),
        ('GraphQL', 'Graphql', 'graphql'),
        ('Tailwind CSS', 'Tailwind', 'tailwind'),
        ('Tailwind CSS', 'TailwindCSS', 'tailwindcss'),
        ('Vite', 'Vite.js', 'vite.js'),
        ('Vite', 'ViteJS', 'vitejs'),
        ('Virtual Machines (VMs)', 'VMs', 'vms'),
        ('Virtual Machines (VMs)', 'Virtual Machines', 'virtual machines'),
        ('Virtual Machines (VMs)', 'Virtual Machine', 'virtual machine'),
        ('Database Management Systems', 'DBMS', 'dbms'),
        ('Database Management Systems', 'Database Management System', 'database management system'),
        ('Computer Networks', 'Computer Networking', 'computer networking')
) AS a(skill_name, alias, normalized_alias)
JOIN skills s ON LOWER(TRIM(s.name)) = LOWER(TRIM(a.skill_name))
ON CONFLICT (normalized_alias) DO NOTHING;
