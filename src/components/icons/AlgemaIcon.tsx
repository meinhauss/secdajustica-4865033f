import type { SVGProps } from "react";

/**
 * Ícone de algema (dois aros interligados por corrente), traço compatível
 * com o estilo Lucide (stroke="currentColor", strokeWidth=2, 24x24).
 */
export function AlgemaIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Aro esquerdo */}
      <circle cx="6.5" cy="15" r="4.5" />
      {/* Aro direito */}
      <circle cx="17.5" cy="15" r="4.5" />
      {/* Corrente (dois elos) */}
      <path d="M9.6 12.4l1.7-1.9" />
      <path d="M12.7 10.5l1.7 1.9" />
      {/* Fecho superior */}
      <path d="M12 10.5V6.5a3 3 0 0 1 3-3" />
    </svg>
  );
}

export default AlgemaIcon;
