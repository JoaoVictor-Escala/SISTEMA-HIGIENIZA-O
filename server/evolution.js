import dotenv from 'dotenv';
dotenv.config();

const getApiUrl = () => process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': process.env.EVOLUTION_API_KEY
});

export const createInstance = async (instanceName) => {
  const url = `${getApiUrl()}/instance/create`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    // Se a instância já existe, tentamos apenas pegar o connectionState ou reconectar
    if (errorText.includes('already exists') || res.status === 403) {
       return connectInstance(instanceName);
    }
    throw new Error(`Falha ao criar instância: ${errorText}`);
  }
  return res.json();
};

// Se a instância já existir mas estiver desconectada, pedimos novo QR code
export const connectInstance = async (instanceName) => {
  const url = `${getApiUrl()}/instance/connect/${instanceName}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  if (!res.ok) {
    throw new Error(`Falha ao conectar instância: ${await res.text()}`);
  }
  return res.json();
};

export const getConnectionState = async (instanceName) => {
  const url = `${getApiUrl()}/instance/connectionState/${instanceName}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  
  if (!res.ok) {
    if (res.status === 404) return { instance: { state: 'disconnected' } };
    throw new Error('Falha ao verificar status da conexão');
  }
  return res.json();
};

export const logoutInstance = async (instanceName) => {
  const url = `${getApiUrl()}/instance/logout/${instanceName}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders()
  });
  
  // Apagar a instância do servidor para limpar
  await fetch(`${getApiUrl()}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).catch(() => null);

  return res.json().catch(() => null);
};

export const sendText = async (instanceName, number, text) => {
  const url = `${getApiUrl()}/message/sendText/${instanceName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      number,
      options: {
        delay: 1200,
        presence: 'composing'
      },
      textMessage: {
        text
      }
    })
  });
  if (!res.ok) throw new Error(`Falha ao enviar mensagem via Evolution: ${await res.text()}`);
  return res.json();
};
