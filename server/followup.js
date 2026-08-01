import cron from 'node-cron';
import { getPendingFollowupsDue, markFollowupSent, getConfig } from './database.js';
import { sendText } from './evolution.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizePhone(phone = '') {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 11) return '55' + digits;
  if (digits.length === 10) return '55' + digits;
  return '55' + digits;
}

export function buildWhatsappLink(phone, message) {
  const normalized = normalizePhone(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
}

export const DEFAULT_FOLLOWUP_MESSAGE =
  `Olá, {nome}! Tudo bem?\n\nAqui é da {empresa}. Faz um tempinho desde o seu último serviço de higienização{servico} e queríamos saber se está tudo bem com o resultado!\n\nQue tal agendar uma nova higienização? Estamos com disponibilidade e adoraríamos te atender novamente.\n\nResponda essa mensagem e vamos marcar!`;

export function buildFollowupMessage(clientName, companyName, serviceName, template) {
  const tpl = (template && template.trim()) ? template : DEFAULT_FOLLOWUP_MESSAGE;
  return tpl
    .replace(/\{nome\}/gi, clientName || 'cliente')
    .replace(/\{empresa\}/gi, companyName || 'nossa empresa')
    .replace(/\{servico\}/gi, serviceName ? ` (${serviceName})` : '');
}

// ─── Cron Job ─────────────────────────────────────────────────────────────────

let cronStarted = false;
const sentLog = [];

export function startFollowupCron() {
  if (cronStarted) return;
  cronStarted = true;

  cron.schedule('0 9,15 * * *', async () => {
    console.log('⏰ [FollowUp] Verificando follow-ups pendentes...');
    try {
      const due = getPendingFollowupsDue();
      if (due.length === 0) {
        console.log('✅ [FollowUp] Nenhum follow-up para hoje.');
        return;
      }

      for (const f of due) {
        let link = buildWhatsappLink(f.client_phone, f.message);
        let statusLog = 'Link Gerado';

        const config = getConfig(f.tenant_id);
        if (config && config.whatsapp_instance_name && config.whatsapp_status === 'open') {
           try {
               await sendText(config.whatsapp_instance_name, normalizePhone(f.client_phone), f.message);
               statusLog = 'Enviado Auto (API)';
               link = null; // Já foi enviado, não precisa do link
               console.log(`📲 [FollowUp] Mensagem AUTOMÁTICA enviada para ${f.client_name}`);
           } catch (err) {
               console.error(`❌ [FollowUp] Erro no envio automático para ${f.client_name}:`, err.message);
               statusLog = 'Erro Auto (Fallback p/ Link)';
           }
        }

        markFollowupSent(f.id);

        const entry = {
          id: f.id,
          client_name: f.client_name,
          client_phone: f.client_phone,
          message: f.message,
          link,
          status_log: statusLog,
          sent_at: new Date().toISOString(),
        };
        sentLog.unshift(entry);
        if (sentLog.length > 100) sentLog.pop();
      }

      console.log(`✅ [FollowUp] ${due.length} follow-up(s) processados.`);
    } catch (err) {
      console.error('❌ [FollowUp] Erro no cron:', err.message);
    }
  });

  console.log('⏰ [FollowUp] Cron iniciado — verificação diária às 9h e 15h.');
}

export function getSentLog() {
  return sentLog;
}

export async function processFollowupNow(followup) {
  let link = buildWhatsappLink(followup.client_phone, followup.message);
  let statusLog = 'Link Gerado';

  const config = getConfig(followup.tenant_id);
  
  if (config && config.whatsapp_instance_name && config.whatsapp_status === 'open') {
     try {
         await sendText(config.whatsapp_instance_name, normalizePhone(followup.client_phone), followup.message);
         statusLog = 'Enviado Auto (API)';
         link = null;
         console.log(`📲 [FollowUp] Mensagem AUTOMÁTICA enviada para ${followup.client_name}`);
     } catch (err) {
         console.error(`❌ [FollowUp] Erro no envio automático para ${followup.client_name}:`, err.message);
         statusLog = 'Erro Auto (Fallback p/ Link)';
     }
  }

  markFollowupSent(followup.id);

  const entry = {
    id: followup.id,
    client_name: followup.client_name,
    client_phone: followup.client_phone,
    message: followup.message,
    link,
    status_log: statusLog,
    sent_at: new Date().toISOString(),
  };
  sentLog.unshift(entry);
  if (sentLog.length > 100) sentLog.pop();

  return link;
}
