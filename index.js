const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(express.json());

// ================================
// CORS
// ================================

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

// ================================
// SUPABASE
// ================================

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

// ================================
// STATUS DA API
// ================================

app.get('/', (req, res) => {
    return res.json({
        status: 'API Online!',
        mensagem: 'Servidor rodando perfeitamente.'
    });
});

// ================================
// VALIDAR KEY NO ROBLOX
// ================================

app.post('/api/validar', async (req, res) => {
    try {
        const { key, userid } = req.body;

        if (!key || !userid) {
            return res.json({
                valido: false,
                mensagem: 'Dados incompletos.'
            });
        }

        const chaveLimpa = String(key)
            .trim()
            .toUpperCase();

        const idCliente = String(userid)
            .trim();

        // ================================
        // BUSCAR KEY
        // ================================

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
                mensagem: 'Erro ao consultar o sistema.'
            });
        }

        // ================================
        // KEY NÃO EXISTE
        // ================================

        if (!data) {
            return res.json({
                valido: false,
                mensagem: 'Key não encontrada.'
            });
        }

        // ================================
        // KEY JÁ CONSUMIDA
        // ================================

        if (data.usada === true) {
            return res.json({
                valido: false,
                mensagem: 'Esta key já foi utilizada no Roblox.'
            });
        }

        // ================================
        // KEY AINDA NÃO FOI VINCULADA
        // ================================

        if (!data.user_id) {
            return res.json({
                valido: false,
                mensagem:
                    'Esta key ainda não foi vinculada a um cliente no Discord.'
            });
        }

        /*
        ========================================
        FORMATO SALVO PELO DISCORD

        NomeDiscord | IDCliente | DiscordID

        Exemplo:

        Lucas | 123456789 | 987654321

        Precisamos pegar:

        123456789
        ========================================
        */

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
                mensagem: 'Vínculo da Key inválido.'
            });
        }

        // Segundo campo = ID do cliente
        const idClienteSalvo = partes[1];

        // ================================
        // COMPARAR ID DO CLIENTE
        // ================================

        if (idClienteSalvo !== idCliente) {
            return res.json({
                valido: false,
                mensagem: 'Esta key pertence a outro usuário.'
            });
        }

        /*
        ========================================
        ID CORRETO

        Agora a Key é realmente consumida
        pelo Roblox.

        false → true

        O user_id NÃO é alterado.
        ========================================
        */

        const { data: atualizado, error: updateError } =
            await supabase
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
                mensagem:
                    'Não foi possível consumir a Key.'
            });
        }

        /*
        ========================================
        PROTEÇÃO CONTRA DUPLO USO

        Se outro pedido consumiu a Key antes,
        atualizado será vazio.
        ========================================
        */

        if (!atualizado) {
            return res.json({
                valido: false,
                mensagem:
                    'Esta key já foi utilizada.'
            });
        }

        // ================================
        // SUCESSO
        // ================================

        return res.json({
            valido: true,
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
            mensagem:
                'Erro interno no servidor.'
        });
    }
});

// ================================
// EXPORT
// ================================

module.exports = app;

// ================================
// SERVIDOR LOCAL
// ================================

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(
            `✅ Servidor rodando na porta ${PORT}`
        );
    });
    }
