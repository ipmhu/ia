// ========== CONFIGURACIÓN ==========
const CONFIG = {
    SUPABASE_URL: 'https://zgorzqfbqxnxcfzyirai.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb3J6cWZicXhueGNmenlpcmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDc4MjYsImV4cCI6MjA5NDM4MzgyNn0.muFPtmZ-WDJV9HYP6Y4EdPK9CwfmzZqa73kvVoKSBJg',
    // Usar OpenRouter (gratis, sin necesidad de tarjeta)
    OPENROUTER_API_KEY: ''  // Puedes dejarlo vacío, usará APIs gratis
};

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
            const respuesta = await this.consultarIA(message);
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
    
    async consultarIA(mensaje) {
        // Usar API gratuita de Hugging Face (sin necesidad de key)
        try {
            const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs: mensaje })
            });
            
            const data = await response.json();
            if (data.generated_text) {
                return data.generated_text;
            }
        } catch (e) {
            console.log('Hugging Face falló, usando respuesta local');
        }
        
        // Fallback: respuesta local inteligente
        return this.respuestaLocal(mensaje);
    },
    
    respuestaLocal(pregunta) {
        const p = pregunta.toLowerCase();
        
        const respuestas = {
            'hola': '¡Hola! 👋 ¿En qué puedo ayudarte hoy?',
            'que es una moto': '🏍️ Una motocicleta es un vehículo de dos ruedas impulsado por un motor. Tiene manillar para dirección y puede alcanzar altas velocidades.',
            'que es el amor': '💖 El amor es un sentimiento de afecto, conexión y cuidado hacia alguien o algo. La psicología lo define como una combinación de intimidad, pasión y compromiso.',
            'que es la ia': '🤖 La Inteligencia Artificial es la simulación de procesos de inteligencia humana por parte de computadoras. Incluye aprendizaje, razonamiento y autocorrección.'
        };
        
        for (const [key, value] of Object.entries(respuestas)) {
            if (p.includes(key)) return value;
        }
        
        if (p.includes('que es') || p.includes('qué es')) {
            return `📚 *Sobre: "${pregunta}"*\n\nTe recomiendo investigar en Wikipedia, libros o preguntar a tus profesores para obtener una respuesta más precisa. ¿Necesitas ayuda con otro tema? 🎓`;
        }
        
        return `📚 *Respuesta académica*\n\nTu pregunta: "${pregunta}"\n\nPara una mejor respuesta, intenta:\n• Ser más específico\n• Preguntar "¿Qué es...?"\n• Escribir "hola" para ver ejemplos\n\n¿Necesitas ayuda con algo más? 🎓`;
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
