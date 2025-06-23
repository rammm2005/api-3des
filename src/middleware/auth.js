export function requireAuth(req, res, next) {
    const email =
        req.method === 'GET'
            ? req.query?.email
            : req.body?.email;

    console.log('🔐 Auth - email:', email);

    if (!email) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Email missing' });
    }

    req.user = { email };
    next();
}
