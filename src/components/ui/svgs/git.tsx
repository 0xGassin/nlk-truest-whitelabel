import React from "react";

export const GitIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M23.523 10.637l-9.663-9.663a3.256 3.256 0 00-4.605 0l-.966.966 4.71 4.711a2.169 2.169 0 012.662 2.661l3.372 3.372a2.174 2.174 0 013.49 1.516 2.175 2.175 0 01-4.35 0 2.163 2.163 0 01.04-.423l-3.334-3.334a2.167 2.167 0 01-2.073.06L8.096 5.794a3.256 3.256 0 00-4.605 4.605l9.663 9.663a3.255 3.255 0 004.605 0l9.764-9.764a3.256 3.256 0 000-4.605zM10.97 7.29a2.175 2.175 0 110 4.35 2.175 2.175 0 010-4.35z" />
  </svg>
);
