import { ShieldCheck } from 'lucide-react';

import * as CommonUI from '#modules/common-ui';

export function Navigation() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex items-center justify-between gap-6 px-6 py-3.5">
        <CommonUI.NavLinkButton
          to="/"
          variant="ghost"
          className="-ml-2 gap-2 text-lg font-semibold tracking-tight"
        >
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          {CommonUI.APP_NAME}
        </CommonUI.NavLinkButton>
      </div>
    </header>
  );
}
