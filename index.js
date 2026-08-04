const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// Permite requisições no formato JSON
app.use(express.json());

// Habilita CORS (Essencial para receber chamadas do Roblox e executores)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Suas credenciais do Supabase
const supabaseUrl = 'https://yqxtabfebukvqexvaejs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeHRhYmZlYnVrdnFleHZhZWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzIzOTksImV4cCI6MjEwMTQ0ODM5OX0.zFgeJkAkd3RHvwWnAgA_uiuYav02_0rtOhW7meQ6_F0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Rota raiz para testar se o servidor está online no navegador
app.get('/', (req, res) => {
    return res.json({ status: "API Online!", mensagem: "Servidor rodando perfeitamente." });
});

// Rota de validação de Key
app.post('/api/validar', async (req, res) => {
    try {
        const { key, userid } = req.body;

        if (!key || !userid) {
            return res.json({ valido: false, mensagem: "Dados incompletos." });
        }

        const { data, error } = await supabase
            .from('keys_sistema')
            .select('*')
            .eq('chave', key)
            .single();

        if (error || !data) {
            return res.json({ valido: false, mensagem: "Key não encontrada." });
        }

        if (data.usada && data.user_id !== String(userid)) {
            return res.json({ valido: false, mensagem: "Key já utilizada por outro usuário." });
        }

        if (!data.usada) {
            await supabase
                .from('keys_sistema')
                .update({ usada: true, user_id: String(userid) })
                .eq('chave', key);
        }

        return res.json({ valido: true, mensagem: "Key validada com sucesso!" });
    } catch (err) {
        return res.status(500).json({ valido: false, mensagem: "Erro interno no servidor." });
    }
});

// Exporta a aplicação para a Vercel Serverless
module.exports = app;

// Inicia servidor local caso não esteja na Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}
