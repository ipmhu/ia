// ========== CONFIGURACIÓN ==========
const CONFIG = {
    SUPABASE_URL: 'https://zgorzqfbqxnxcfzyirai.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb3J6cWZicXhueGNmenlpcmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDc4MjYsImV4cCI6MjA5NDM4MzgyNn0.muFPtmZ-WDJV9HYP6Y4EdPK9CwfmzZqa73kvVoKSBJg',
    OPENROUTER_API_KEY: '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'
};

const App = {
    // ... (código del login, etc.) ...
    
    async consultarOpenRouter(mensaje) {
        // Modelos gratuitos NUEVOS que funcionan actualmente (mayo 2026)
        const modelosGratuitos = [
            'tencent/hy3-preview:free',           // Tencent Hy3, 256K contexto [citation:10]
            'qwen/qwen3.6-plus-preview:free',     // Qwen 3.6, 1M contexto [citation:1]
            'nvidia/nemotron-3-super-120b-a12b:free', // NVIDIA, 1M contexto, muy rápido [citation:9]
            'poolside/laguna-m.1:free',           // Laguna M.1, 128K contexto [citation:6]
            'inclusionai/ring-2.6-1t:free',       // Ring-2.6-1T, 262K contexto [citation:6]
            'baidu/cobuddy:free',                 // CoBuddy, código y agentes [citation:3]
            'google/gemma-4-31b-it:free',         // Gemma 4, 256K contexto [citation:3]
            'z-ai/glm-4.5-air:free',              // GLM 4.5 Air, 131K contexto [citation:9]
            'openrouter/free'                      // Router automático de OpenRouter
        ];
        
        for (const modelo of modelosGratuitos) {
            try {
                console.log(`🔄 Probando modelo: ${modelo}`);
                
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
                        'HTTP-Referer': window.location.href,
                        'X-Title': 'Asistente Politécnico'
                    },
                    body: JSON.stringify({
                        model: modelo,
                        messages: [
                            {
                                role: 'system',
                                content: `Eres un asistente académico amable.`
                            },
                            {
                                role: 'user',
                                content: mensaje
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                });
                
                const data = await response.json();
                
                if (response.status === 404 || response.status === 400) {
                    console.log(`❌ Modelo ${modelo} no disponible`);
                    continue;
                }
                
                if (data.error) {
                    console.log(`❌ Error con ${modelo}:`, data.error.message);
                    continue;
                }
                
                if (data.choices && data.choices[0]) {
                    console.log(`✅ Usando modelo: ${modelo}`);
                    return data.choices[0].message.content;
                }
            } catch (e) {
                console.log(`❌ Falló ${modelo}`);
            }
        }
        
        return "No se pudo conectar con la IA. ¿Puedes intentar de nuevo más tarde?";
    }
};
