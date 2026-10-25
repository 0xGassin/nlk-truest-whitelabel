import { dialogContentRootClassName, dialogPanelClassName } from "@/components/ui/dialog-panel";

export const integrationDialogContentClassName =
  "h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] " +
  dialogContentRootClassName +
  " " +
  dialogPanelClassName +
  " duration-300 ease-out data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6 sm:max-w-[calc(100vw-2rem)] lg:top-4 lg:left-auto lg:right-4 lg:max-w-none lg:w-[min(48rem,calc(100vw-2rem))] lg:translate-x-0 lg:translate-y-0 lg:data-[state=open]:slide-in-from-right-10 lg:data-[state=closed]:slide-out-to-right-10";
