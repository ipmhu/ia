// ========== CONFIGURACIÓN ==========
const CONFIG = {
    SUPABASE_URL: 'https://zgorzqfbqxnxcfzyirai.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb3J6cWZicXhueGNmenlpcmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDc4MjYsImV4cCI6MjA5NDM4MzgyNn0.muFPtmZ-WDJV9HYP6Y4EdPK9CwfmzZqa73kvVoKSBJg',
    DEEPSEEK_API_KEY: 'sk-bd31a79ce6344b52ac743e2bf750ffb1'  
};

// ========== APLICACIÓN PRINCIPAL ==========
const App = {
    supabase: null,
    currentUser: null,
    currentEstudiante: null,
    
    async init() {
        console.log('🚀 Iniciando aplicación...');
        
        // Verificar API Key
        if (!CONFIG.DEEPSEEK_API_KEY || CONFIG.DEEPSEEK_API_KEY === 'sk-tu-api-key-aqui') {
            console.warn('⚠️ No has configurado tu API Key de DeepSeek');
        }
        
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
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
    },
    
    showLogin() {
        const loginScreen = document.getElementById('loginScreen');
        const chatScreen = document.getElementById('chatScreen');
        if (loginScreen) loginScreen.classList.add('active');
        if (chatScreen) chatScreen.classList.remove('active');
    },
    
    showChat() {
        const loginScreen = document.getElementById('loginScreen');
        const chatScreen = document.getElementById('chatScreen');
        if (loginScreen) loginScreen.classList.remove('active');
        if (chatScreen) chatScreen.classList.add('active');
        this.loadWelcomeMessage();
    },
    
    async login() {
        const matricula = document.getElementById('matricula').value.trim();
        const password = document.getElementById('password').value;
        const btn = document.getElementById('btnLogin');
        
        if (!btn) return;
        
        btn.disabled = true;
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline';
        
        try {
            const { data: estudiante, error: estudianteError } = await this.supabase
                .from('estudiantes')
                .select('email')
                .eq('matricula', matricula)
                .single();
            
            if (estudianteError || !estudiante) {
                throw new Error('Matrícula no encontrada');
            }
            
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
            if (errorDiv) {
                const errorText = errorDiv.querySelector('.error-text');
                if (errorText) errorText.textContent = err.message;
                errorDiv.classList.add('show');
                setTimeout(() => errorDiv.classList.remove('show'), 3000);
            }
        } finally {
            btn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    },
    
    async loadEstudianteData() {
        const { data } = await this.supabase
            .from('estudiantes')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
        
        this.currentEstudiante = data;
        const userNameDisplay = document.getElementById('userNameDisplay');
        if (userNameDisplay) {
            userNameDisplay.textContent = `${data.nombre_completo} | ${data.especialidad}`;
        }
    },
    
    loadWelcomeMessage() {
        const welcomeMessage = `¡Bienvenido ${this.currentEstudiante.nombre_completo}! 👋\n\nSoy tu asistente académico con IA de DeepSeek. Puedo responder CUALQUIER pregunta:\n\n• 📚 Preguntas académicas\n• 🌍 Cultura general\n• 🔬 Ciencia y tecnología\n• 🎮 Entretenimiento\n• 💡 Curiosidades\n• Y mucho más...\n\n¡Pregúntame lo que sea! 🎓`;
        
        this.addMessage(welcomeMessage, 'assistant');
    },
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        input.value = '';
        
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.style.display = 'block';
        
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.disabled = true;
        
        try {
            const respuesta = await this.consultarDeepSeek(message);
            
            if (typing) typing.style.display = 'none';
            this.addMessage(respuesta, 'assistant');
            
        } catch (error) {
            console.error('Error:', error);
            if (typing) typing.style.display = 'none';
            this.addMessage('Lo siento, tuve un problema. ' + error.message, 'assistant');
        } finally {
            if (sendBtn) sendBtn.disabled = false;
            this.scrollToBottom();
        }
    },
    
    async consultarDeepSeek(mensaje) {
        console.log('📤 Enviando a DeepSeek:', mensaje);
        
        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: `Eres un asistente académico llamado "Asistente Politécnico". 
                            Eres amable, educativo y das respuestas claras, completas y útiles. 
                            El estudiante se llama ${this.currentEstudiante?.nombre_completo?.split(' ')[0] || 'estudiante'} 
                            y estudia ${this.currentEstudiante?.especialidad || 'una especialidad'}.
                            Responde cualquier pregunta de forma educativa, completa y amigable.
                            Usa emojis ocasionalmente para hacer la conversación más amena.
                            Si te preguntan sobre calificaciones o horarios específicos, indica que necesitas acceso a la base de datos.`
                        },
                        {
                            role: 'user',
                            content: mensaje
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: false
                })
            });
            
            const data = await response.json();
            console.log('📥 Respuesta DeepSeek:', data);
            
            if (data.error) {
                console.error('Error API DeepSeek:', data.error);
                throw new Error(`DeepSeek Error: ${data.error.message}`);
            }
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                throw new Error('Respuesta inesperada de DeepSeek');
            }
            
        } catch (error) {
            console.error('Error en consultarDeepSeek:', error);
            throw new Error('Error de conexión con DeepSeek. Verifica tu API Key y conexión a internet.');
        }
    },
    
    addMessage(text, role) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        
        const avatar = role === 'user' ? '👤' : '🤖';
        const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        // Escapar HTML
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
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    },
    
    quickAsk(question) {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = question;
            this.sendMessage();
        }
    },
    
    async logout() {
        await this.supabase.auth.signOut();
        location.reload();
    }
};

// Iniciar cuando cargue la página
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});