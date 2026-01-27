import { useToastContext } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";

/**
 * Hook pour vérifier une permission et afficher un message d'erreur si l'utilisateur n'a pas la permission
 * @param permission La permission à vérifier
 * @param actionMessage Message à afficher si l'action n'est pas autorisée (ex: "créer un ticket")
 * @returns Un objet avec `hasPermission` (booléen) et `checkPermission` (fonction à appeler avant l'action)
 */
export const usePermissionGuard = (
  permission: string,
  actionMessage?: string,
) => {
  const { hasPermission } = useAuth();
  const toast = useToastContext();

  const hasAccess = hasPermission(permission);

  const checkPermission = (): boolean => {
    if (!hasAccess) {
      toast.error(
        actionMessage
          ? `Vous n'avez pas la permission de ${actionMessage}`
          : `Vous n'avez pas la permission nécessaire pour effectuer cette action`,
      );
      return false;
    }
    return true;
  };

  return {
    hasPermission: hasAccess,
    checkPermission,
  };
};

/**
 * Hook pour vérifier plusieurs permissions (au moins une doit être présente)
 */
export const useAnyPermissionGuard = (
  permissions: string[],
  actionMessage?: string,
) => {
  const { hasPermission } = useAuth();
  const toast = useToastContext();

  const hasAccess = permissions.some((perm) => hasPermission(perm));

  const checkPermission = (): boolean => {
    if (!hasAccess) {
      toast.error(
        actionMessage
          ? `Vous n'avez pas la permission de ${actionMessage}`
          : `Vous n'avez pas la permission nécessaire pour effectuer cette action`,
      );
      return false;
    }
    return true;
  };

  return {
    hasPermission: hasAccess,
    checkPermission,
  };
};
