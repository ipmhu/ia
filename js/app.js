// ========== CONFIGURACIÓN ==========
const CONFIG = {
    SUPABASE_URL: 'https://zgorzqfbqxnxcfzyirai.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb3J6cWZicXhueGNmenlpcmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDc4MjYsImV4cCI6MjA5NDM4MzgyNn0.muFPtmZ-WDJV9HYP6Y4EdPK9CwfmzZqa73kvVoKSBJg',
    OPENROUTER_API_KEY: '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'
};

const App = {
    supabase: null,
    currentUser: null,
    currentEstudiante: null,
    
    async init() {
        console.log('🚀 Iniciando...');
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        
        const { data: { session } } = await this.supabase.auth.getSession();
        
        if (session) {
            this.currentUser = session.user;
            await this.loadEstudianteData();
            this.showChat();
        } else {
            this.showLogin();
        }
        
        this.setupEvents();
    },
    
    setupEvents() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    },
    
    showLogin() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('chatScreen').classList.remove('active');
    },
    
    showChat() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('chatScreen').classList.add('active');
        this.loadWelcomeMessage();
    },
    
    async login() {
        const matricula = document.getElementById('matricula').value.trim();
        const password = document.getElementById('password').value;
        const btn = document.getElementById('btnLogin');
        
        btn.disabled = true;
        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.btn-loader').style.display = 'inline';
        
        try {
            const { data: estudiante } = await this.supabase
                .from('estudiantes')
                .select('email')
                .eq('matricula', matricula)
                .single();
            
            if (!estudiante) throw new Error('Matrícula no encontrada');
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: estudiante.email,
                password: password
            });
            
            if (error) throw error;
            
            this.currentUser = data.user;
            await this.loadEstudianteData();
            this.showChat();
            
        } catch (err) {
            const errorDiv = document.getElementById('loginError');
            errorDiv.querySelector('.error-text').textContent = err.message;
            errorDiv.classList.add('show');
            setTimeout(() => errorDiv.classList.remove('show'), 3000);
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').style.display = 'inline';
            btn.querySelector('.btn-loader').style.display = 'none';
        }
    },
    
    async loadEstudianteData() {
        const { data } = await this.supabase
            .from('estudiantes')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
        
        this.currentEstudiante = data;
        document.getElementById('userNameDisplay').textContent = `${data.nombre_completo} | ${data.especialidad}`;
    },
    
    loadWelcomeMessage() {
        this.addMessage(`¡Bienvenido ${this.currentEstudiante.nombre_completo}! 👋\n\nSoy tu asistente académico. ¡Pregúntame lo que sea! 🎓`, 'assistant');
    },
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        input.value = '';
        
        document.getElementById('typingIndicator').style.display = 'block';
        document.getElementById('sendBtn').disabled = true;
        
        try {
            const respuesta = await this.consultarOpenRouter(message);
            document.getElementById('typingIndicator').style.display = 'none';
            this.addMessage(respuesta, 'assistant');
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('typingIndicator').style.display = 'none';
            this.addMessage(`❌ Error: ${error.message}`, 'assistant');
        } finally {
            document.getElementById('sendBtn').disabled = false;
            this.scrollToBottom();
        }
    },
    
    async consultarOpenRouter(mensaje) {
        // Modelos gratuitos que funcionan actualmente
        const modelosGratuitos = [
            'google/gemini-2.0-flash-exp:free',      // Mejor calidad
            'meta-llama/llama-3-8b-instruct:free',   // Buena calidad
            'mistralai/mistral-7b-instruct:free',    // Rápido
            'microsoft/phi-3-mini-4k-instruct:free', // Phi-3 (el que intentaste)
            'qwen/qwen-2-7b-instruct:free'           // Alternativa china
        ];
        
        for (const modelo of modelosGratuitos) {
            try {
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
                                content: `Eres un asistente académico amable. El estudiante se llama ${this.currentEstudiante?.nombre_completo?.split(' ')[0] || 'estudiante'}. Responde de forma clara y educativa.`
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
                
                if (response.status === 404) {
                    console.log(`Modelo ${modelo} no disponible, probando siguiente...`);
                    continue;
                }
                
                if (data.error) {
                    console.log(`Error con ${modelo}:`, data.error);
                    continue;
                }
                
                if (data.choices && data.choices[0]) {
                    console.log(`✅ Usando modelo: ${modelo}`);
                    return data.choices[0].message.content;
                }
            } catch (e) {
                console.log(`Falló ${modelo}`);
            }
        }
        
        // Si ningún modelo funciona, usar respuesta local
        return this.respuestaLocal(mensaje);
    },
    
    respuestaLocal(mensaje) {
        const p = mensaje.toLowerCase();
        
        if (p.includes('hola') || p.includes('buenos')) {
            return "¡Hola! 👋 ¿En qué puedo ayudarte hoy?";
        }
        
        if (p.includes('moto')) {
            return "🏍️ **¿Qué es una moto?**\n\nUna motocicleta es un vehículo de dos ruedas impulsado por un motor. Tiene manillar para dirección y puede alcanzar altas velocidades. Existen varios tipos: deportivas, cruiser, touring, enduro, etc.";
        }
        
        if (p.includes('agua')) {
            return "💧 **¿Qué es el agua?**\n\nEl agua es una molécula compuesta por dos átomos de hidrógeno y uno de oxígeno (H₂O). Es esencial para la vida, cubre el 71% de la Tierra y existe en tres estados: sólido, líquido y gaseoso.";
        }
        
        if (p.includes('ia') || p.includes('inteligencia artificial')) {
            return "🤖 **¿Qué es la IA?**\n\nLa Inteligencia Artificial es la simulación de procesos de inteligencia humana por computadoras. Incluye aprendizaje automático, reconocimiento de patrones, procesamiento de lenguaje natural y más.";
        }
        
        return `📚 **Respuesta académica**\n\nSobre tu pregunta: "${mensaje}"\n\nTe recomiendo buscar en fuentes confiables como Wikipedia, libros especializados o consultar a tus profesores.\n\n¿Necesitas ayuda con otro tema? 🎓`;
    },
    
    addMessage(text, role) {
        const container = document.getElementById('chatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        
        const avatar = role === 'user' ? '👤' : '🤖';
        const time = new Date().toLocaleTimeString();
        
        const temp = document.createElement('div');
        temp.textContent = text;
        const safeText = temp.innerHTML.replace(/\n/g, '<br>');
        
        msgDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <p>${safeText}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        container.appendChild(msgDiv);
        this.scrollToBottom();
    },
    
    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        setTimeout(() => container.scrollTop = container.scrollHeight, 100);
    },
    
    quickAsk(question) {
        document.getElementById('messageInput').value = question;
        this.sendMessage();
    },
    
    async logout() {
        await this.supabase.auth.signOut();
        location.reload();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
