const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
    );
    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
    );

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// SUPABASE
const supabaseUrl =
    'https://yqxtabfebukvqexvaejs.supabase.co';

const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
    console.error('❌ SUPABASE_KEY não configurada.');
    process.exit(1);
}

const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

// STATUS
app.get('/', (req, res) => {
    return res.json({
        status: 'API Online!',
        mensagem: 'Servidor rodando perfeitamente.'
    });
});

// VALIDAR KEY - GET
app.get('/api/validar', async (req, res) => {
    try {
        const { key, userid } = req.query;

        if (!key || !userid) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                mensagem: 'Dados incompletos.'
            });
        }

        const chaveLimpa = String(key)
            .trim()
            .toUpperCase();

        const idCliente = String(userid)
            .trim();

        // Procura a Key
        const { data, error } = await supabase
            .from('keys_sistema')
            .select('id, chave, usada, user_id')
            .ilike('chave', chaveLimpa)
            .maybeSingle();

        if (error) {
            console.error(
                '❌ Erro ao consultar Supabase:',
                error
            );

            return res.status(500).json({
                valido: false,
                valida: false,
                success: false,
                mensagem: 'Erro ao consultar o sistema.'
            });
        }

        // Key não encontrada
        if (!data) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                mensagem: 'Key não encontrada.'
            });
        }

        // Key já consumida no Roblox
        if (data.usada === true) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                mensagem: 'Esta key já foi utilizada no Roblox.'
            });
        }

        // Key ainda não vinculada no Discord
        if (!data.user_id) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                mensagem:
                    'Esta key ainda não foi vinculada a um cliente no Discord.'
            });
        }

        // Formato:
        // NomeDiscord | IDCliente | DiscordID
        const partes = String(data.user_id)
            .split('|')
            .map(part => part.trim());

        if (partes.length < 2) {
            console.error(
                '❌ Formato inválido de user_id:',
                data.user_id
            );

            return res.status(500).json({
                valido: false,
                valida: false,
                success: false,
                mensagem: 'Vínculo da Key inválido.'
            });
        }

        const idClienteSalvo = partes[1];

        // Confere o ID do cliente
        if (idClienteSalvo !== idCliente) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                mensagem: 'Esta key pertence a outro usuário.'
            });
        }

        // Consome a Key
        const {
            data: atualizado,
            error: updateError
        } = await supabase
            .from('keys_sistema')
            .update({
                usada: true
            })
            .eq('id', data.id)
            .eq('usada', false)
            .select(
                'id, chave, usada, user_id'
            )
            .maybeSingle();

        if (updateError) {
            console.error(
                '❌ Erro ao consumir Key:',
                updateError
            );

            return res.status(500).json({
                valido: false,
                valida: false,
                success: false,
                mensagem:
                    'Não foi possível consumir a Key.'
            });
        }

        // Evita dupla utilização
        if (!atualizado) {
            return res.json({
                valido: false,
                valida: false,
                success: false,
                mensagem:
                    'Esta key já foi utilizada.'
            });
        }

        // SUCESSO
        return res.json({
            valido: true,
            valida: true,
            success: true,
            mensagem:
                'Key validada e consumida com sucesso!',
            key: atualizado.chave,
            userid: idCliente,
            usada: true
        });

    } catch (err) {
        console.error(
            '❌ Erro interno:',
            err
        );

        return res.status(500).json({
            valido: false,
            valida: false,
            success: false,
            mensagem:
                'Erro interno no servidor.'
        });
    }
});

// Também aceita POST caso queira testar pelo navegador/API
app.post('/api/validar', async (req, res) => {
    req.query = {
        key: req.body?.key,
        userid: req.body?.userid
    };

    return app._router.handle(req, res);
});

module.exports = app;

// Servidor local
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(
            `✅ Servidor rodando na porta ${PORT}`
        );
    });
}
