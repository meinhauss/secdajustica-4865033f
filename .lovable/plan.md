I will create two new roles, **GAECO** and **Chefe GAECO**, with the following specifications:
- **GAECO**: Will have the same access level as "Polícia Civil".
- **Chefe GAECO**: Will have the same access level as "Delegado" and the additional ability to create and manage public exams (Concursos).

### Technical Details

1.  **Frontend Updates**:
    *   **`src/components/DashboardLayout.tsx`**: Add `gaeco` and `chefe_gaeco` to the role labels and menu item permission lists.
    *   **`src/components/LoginPage.tsx`**: Add the new roles to any relevant lists (if used for registration or selection).
    *   **`src/components/sections/UsuariosSection.tsx`**: Add labels for the new roles so they appear correctly in the user management panel.
    *   **`src/components/sections/ConcursosSection.tsx`**: Update the `isAdmin` and `availableCargos` logic to include `chefe_gaeco`.
    *   **Other Sections**: Review `TCOSection.tsx` and others mentioned in the search to ensure GAECO roles are included in police-related filters.

2.  **Database Updates**:
    *   Create a migration to update the RLS policies if necessary, though the current system seems to rely on the `user_roles` table which should handle new role strings fine as long as the application logic respects them.
    *   I will verify if there are specific database functions (like `delegado_remove_police_role` seen in `UsuariosSection.tsx`) that need to be aware of the new roles.

3.  **Permissions Alignment**:
    *   **`gaeco`** will be added wherever `policia_civil` is present.
    *   **`chefe_gaeco`** will be added wherever `delegado` is present, plus the `concursos` management.

### Verification Plan
- Check `DashboardLayout` to ensure the sidebar items appear correctly for the new roles.
- Check `ConcursosSection` to ensure `Chefe GAECO` can see management buttons.
- Check `UsuariosSection` to ensure the new role labels appear.