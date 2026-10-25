import type { SVGProps } from "react";

const RdsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    fill="#fff"
    fillRule="evenodd"
    stroke="#000"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 74.375 85"
  >
    <g stroke="none" transform="translate(2.188 2.5)">
      <path d="M70 17.678l-8.75-9.767L48.913 40 61.25 72.067 70 62.322V17.678z" fill="#2e73b8" />
      <path d="M45.937 80l15.313-7.933V7.911L45.937 0 27.759 40l18.178 40z" fill="#5294cf" />
      <path d="M24.063 80h21.875V0H24.063L10.938 40l13.125 40z" fill="#2e73b8" />
      <path d="M8.75 72.056L24.063 80V0L8.75 7.911 1.98 40l6.77 32.056z" fill="#205b99" />
      <path d="M0 62.322l8.75 9.733V7.911L0 17.678v44.644z" fill="#19486f" />
    </g>
  </svg>
);

export { RdsIcon };
