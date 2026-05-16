// ========== CONFIGURACIÓN ==========
const CONFIG = {
    SUPABASE_URL: 'https://zgorzqfbqxnxcfzyirai.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb3J6cWZicXhueGNmenlpcmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDc4MjYsImV4cCI6MjA5NDM4MzgyNn0.muFPtmZ-WDJV9HYP6Y4EdPK9CwfmzZqa73kvVoKSBJg',
    GEMINI_API_KEY: 'AIzaSyAL353weZ9MAa24Ah5KXvg4Q26uvgPM-m4'
};

// ========== APLICACIÓN PRINCIPAL ==========
const App = {
    supabase: null,
    currentUser: null,
    currentEstudiante: null,
    
    async init() {
        console.log('🚀 Iniciando aplicación...');
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
            const respuesta = await this.consultarGemini(message);
            document.getElementById('typingIndicator').style.display = 'none';
            this.addMessage(respuesta, 'assistant');
        } catch (error) {
            document.getElementById('typingIndicator').style.display = 'none';
            this.addMessage(`❌ Error: ${error.message}`, 'assistant');
        } finally {
            document.getElementById('sendBtn').disabled = false;
            this.scrollToBottom();
        }
    },
    
    async consultarGemini(mensaje) {
        // Probar con diferentes modelos hasta encontrar uno que funcione
        const modelos = [
            'gemini-1.0-pro',
            'gemini-pro',
            'gemini-1.5-flash'
        ];
        
        for (const modelo of modelos) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Responde esta pregunta de forma educativa y amigable: ${mensaje}`
                            }]
                        }]
                    })
                });
                
                const data = await response.json();
                
                if (!data.error && data.candidates) {
                    console.log(`✅ Modelo ${modelo} funcionó`);
                    return data.candidates[0].content.parts[0].text;
                }
            } catch (e) {
                console.log(`❌ Modelo ${modelo} falló`);
            }
        }
        
        // Si ningún modelo funciona, dar respuesta local
        return this.respuestaLocal(mensaje);
    },
    
    respuestaLocal(pregunta) {
        const p = pregunta.toLowerCase();
        
        if (p.includes('moto') || p.includes('vehículo')) {
            return "🏍️ *¿Qué es una moto?*\n\nUna motocicleta es un vehículo de dos ruedas impulsado por un motor. Tiene manillar para dirección y puede ser manual o automática. ¡Es un medio de transporte popular!";
        }
        
        if (p.includes('hola') || p.includes('buenos')) {
            return "¡Hola! 👋 ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre temas académicos, ciencia, tecnología, cultura general y más.";
        }
        
        return `📚 *Respuesta académica*\n\nSobre tu pregunta: "${pregunta}"\n\nTe recomiendo consultar fuentes confiables como libros, artículos científicos o preguntar a tus profesores para obtener una respuesta más precisa.\n\n¿Necesitas ayuda con otro tema? 🎓`;
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
