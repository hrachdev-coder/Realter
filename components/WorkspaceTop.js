"use client";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";
import { useCrm } from "./CrmProvider";
export default function WorkspaceTop() {
  const { t: tr, locale } = useLocale();

  const { profile } = useCrm();
  return (
    <div className="dashboard-top">
      <span>{tr("Your real estate workspace")}</span>
      <div className="workspace-account">
        <LanguageSwitcher />
        <span>{profile.full_name}</span>
      </div>
    </div>
  );
}
