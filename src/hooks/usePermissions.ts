import { useState, useEffect, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

export function usePermissions() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      if (!isAuthenticated) {
        if (mounted) {
          setPermissions([]);
          setLoading(false);
        }
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        const payloadBase64 = token.split(".")[1];
        const decodedPayload = atob(
          payloadBase64.replace(/-/g, "+").replace(/_/g, "/")
        );
        const payloadJson = JSON.parse(decodedPayload);
        const tokenPermissions = Array.isArray(payloadJson.permissions)
          ? payloadJson.permissions
          : [];

        if (mounted) {
          setPermissions(tokenPermissions);
        }
      } catch {
        if (mounted) {
          setPermissions([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPermissions();

    return () => {
      mounted = false;
    };
  }, [getAccessTokenSilently, isAuthenticated]);

  const hasPermission = useCallback(
    (permission: string) => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  return {
    permissions,
    hasPermission,
    loading,
  };
}
