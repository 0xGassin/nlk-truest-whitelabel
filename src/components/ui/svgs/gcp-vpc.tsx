import type { SVGProps } from "react";

const GcpVpcIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    fill="#fff"
    fillRule="evenodd"
    stroke="#000"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 81 81"
  >
    <g stroke="none" fillRule="nonzero" transform="translate(0.5 0.5)">
      <path d="M56 0h24v24H56z" fill="#aecbfa" />
      <path d="M68 0h12v24H68z" fill="#669df6" />
      <path d="M56 56h24v24H56z" fill="#aecbfa" />
      <path d="M68 56h12v24H68z" fill="#669df6" />
      <path d="M0 0h24v24H0z" fill="#aecbfa" />
      <path d="M12 0h12v24H12z" fill="#669df6" />
      <path d="M0 56h24v24H0z" fill="#aecbfa" />
      <g fill="#669df6">
        <path d="M12 56h12v24H12zM24 8h32v8H24z" />
        <path d="M24 64h32v8H24zm40-40h8v32h-8zM8 24h8v32H8z" />
      </g>
      <path d="M8 24h8v8H8zm56 0h8v8h-8zM24 8h8v8h-8zm0 56h8v8h-8z" fill="#4285f4" />
    </g>
  </svg>
);

export { GcpVpcIcon };
