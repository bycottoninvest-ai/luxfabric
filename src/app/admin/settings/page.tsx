import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { isSmsConfigured } from "@/lib/sms";
import { telegramOrdersConfigured } from "@/lib/telegram-orders";

export default async function AdminSettingsPage() {
  const settings = await getSettings([
    "app_domain",
    "app_name",
    "support_phone",
    "instagram_username",
    "instagram_verify_token",
    "instagram_page_token",
    "instagram_app_secret",
    "instagram_enabled",
    "telegram_bot_token",
    "telegram_director_chat_id",
    "telegram_orders_chat_id",
    "telegram_director_enabled",
    "click_merchant_id",
    "click_service_id",
    "click_secret_key",
    "payme_merchant_id",
    "payme_key",
    "default_courier_partner",
    "courier_bts_contact",
    "courier_fargo_contact",
    "courier_yandex_contact",
    "courier_notes",
  ]);
  const tg = await telegramOrdersConfigured();

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Sozlamalar</h1>
        <p className="mt-1 text-sm text-lf-muted">
          Domen, Instagram, Telegram buyurtmalar va to‘lov — hammasi admin orqali.
        </p>
      </div>
      <SettingsForm
        initial={settings}
        smsConfigured={isSmsConfigured()}
        telegramConfigured={tg.configured}
      />
    </div>
  );
}
