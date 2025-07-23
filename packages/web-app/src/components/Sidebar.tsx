import {
  type Account,
  type Tenant,
  VALIDATE_SESSION_ROUTE,
} from "@pacetrack/schema";
import type { SessionGetAccountsMetaRouteResponse } from "@pacetrack/schema/src/routes-schema/session/session.get-accounts-meta.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Layout, LogOut, Settings } from "lucide-react";
import { Button } from "~/components/primitives/button";
import { client } from "~/utils/helpers/api-client";
import { Dialog } from "./primitives/dialog";
import { SidebarSettingsPopover } from "./SidebarSettingsPopover";
import { ThemeButton } from "./ThemeButton";

export function Sidebar({
  account,
  tenant,
  meta,
  baseApiUrl,
}: {
  account?: Account;
  tenant?: Tenant;
  meta?: SessionGetAccountsMetaRouteResponse["payload"];
  baseApiUrl?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: async () => {
      const resp = await client("SIGN_OUT_ROUTE", {});
      return resp;
    },
    onSuccess: ({ data }) => {
      if (data.status === "ok") {
        qc.invalidateQueries({ queryKey: [VALIDATE_SESSION_ROUTE.path] });
        navigate({
          to: "/auth/sign-in",
        });
      }
    },
  });

  return (
    <div className="w-64 h-full border-r border-background-100 flex flex-col">
      <div className="p-4 border-b border-background-100">
        <SidebarSettingsPopover
          tenant={tenant}
          account={account}
          meta={meta}
          baseApiUrl={baseApiUrl}
        />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Layout className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </nav>
      <div className="p-4 border-t border-background-100 space-y-2.5">
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="flex items-center justify-between gap-3 w-full"
          >
            <Link to="/settings">
              <span>Settings</span>
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
          <ThemeButton />
        </div>

        <Dialog>
          <Dialog.Trigger asChild>
            <Button className="w-full justify-between gap-2">
              <span>Sign out</span>
              <LogOut className="w-4 h-4" />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay>
              <Dialog.Content className="max-w-sm">
                <Dialog.Title>Sign out</Dialog.Title>
                <Dialog.Description>
                  Are you sure you want to sign out?
                </Dialog.Description>
                <div className="flex justify-end gap-2 mt-6">
                  <Dialog.Close asChild>
                    <Button variant="outline">Cancel</Button>
                  </Dialog.Close>

                  <Button variant="default" onClick={() => mutate()}>
                    Sign out
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Portal>
        </Dialog>
      </div>
    </div>
  );
}
