const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Form data read karne ke liye
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'parmar_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Static files
app.use(express.static(__dirname));

// Resume upload storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, 'resume.pdf');
    }
});

const upload = multer({ storage });

// Project image storage
const projectStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/projects/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const uploadProject = multer({ storage: projectStorage });

// Uploads folder public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect database
db.connect((err) => {

    if (err) {
        console.log('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ MySQL Connected');
    }

});

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Middleware - check login
function isAuthenticated(req, res, next) {

    if (req.session.user) {

        next();

    } else {

        // Agar browser normal page maang raha hai
        if (req.accepts('html')) {

            return res.redirect('/login.html');

        }

        // Agar fetch/API request hai
        return res.status(401).send('Unauthorized');

    }

}

// Secure login
app.post('/login', (req, res) => {

    const { email, password } = req.body;

    const sql = 'SELECT * FROM admins WHERE email = ?';

    db.query(sql, [email], async (err, results) => {


        if (err) {
            console.log("LOGIN DATABASE ERROR:", err);
            return res.send(err.message);
        }

        if (results.length === 0) {
            return res.send('Invalid Email or Password');
        }

        const admin = results[0];

        const match = await bcrypt.compare(password, admin.password);
        
        console.log('Entered:', password);
        console.log('Hash:', admin.password);
        console.log('Match:', match);

        if (match) {

            req.session.user = {
                id: admin.id,
                email: admin.email
            };

            res.redirect('/dashboard');

        } else {

            res.send('Invalid Email or Password');

        }

    });

});

// Protected dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Add Project
// Add Project with image upload
app.post('/add-project', isAuthenticated, uploadProject.single('image'), (req, res) => {

    const { title, technology, description, github, demo } = req.body;

    const image = req.file ? req.file.filename : null;

    const sql = `
        INSERT INTO projects (title, technology, description, github, demo, image)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql,
        [title, technology, description, github, demo, image],
        (err, result) => {

            if (err) {
                console.log("PROJECT INSERT ERROR:", err);
                return res.send(err.message);
            }

            console.log('📁 Project added:', title);

            res.send(`
                <h2 style="color:green;text-align:center;margin-top:50px;">
                    Project added successfully!
                </h2>

                <div style="text-align:center;margin-top:20px;">
                    <a href="/manage-projects.html">Manage Projects</a>
                </div>
            `);

        });

});
// API - Get all projects
app.get('/api/projects', (req, res) => {

    const sql = 'SELECT * FROM projects ORDER BY created_at DESC';

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({ error: 'Database Error' });
        }

        res.json(results);

    });

});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

// API - Get all projects
app.get('/api/projects', (req, res) => {

    const sql = 'SELECT * FROM projects';

    db.query(sql, (err, results) => {

        if (err) {
            console.log('API Error:', err);
            return res.status(500).send('Database Error');
        }

        console.log('📦 Projects API called');

        res.json(results);

    });

});

// Delete Project
app.delete('/delete-project/:id', isAuthenticated, (req, res) => {

    const projectId = req.params.id;

    const sql = 'DELETE FROM projects WHERE id = ?';

    db.query(sql, [projectId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error deleting project');
        }

        console.log('🗑️ Project Deleted:', projectId);

        res.send('Project deleted successfully');

    });

});

// Contact Form
app.post('/contact', (req, res) => {

    console.log('📨 Contact request body:', req.body);

    const { name, email, subject, message } = req.body;

    const sql = `
        INSERT INTO contact_messages (name, email, subject, message)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [name, email, subject, message], (err, result) => {

        if (err) {
            console.error('❌ Contact insert error:', err);
            return res.send('Error sending message');
        }

        console.log('📩 New Contact Message from:', name);

        res.send(`
            <h2 style="color:green;text-align:center;margin-top:50px;">
                Message sent successfully!
            </h2>

            <div style="text-align:center;margin-top:20px;">
                <a href="/">Go Back Home</a>
            </div>
        `);

    });

});

// Get all contact messages
app.get('/api/messages', isAuthenticated, (req, res) => {

    const sql = 'SELECT * FROM contact_messages ORDER BY created_at DESC';

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        res.json(results);

    });

});

// Delete contact message
app.delete('/delete-message/:id', isAuthenticated, (req, res) => {

    const messageId = req.params.id;

    const sql = 'DELETE FROM contact_messages WHERE id = ?';

    db.query(sql, [messageId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error deleting message');
        }

        console.log('🗑️ Message deleted:', messageId);

        res.send('Message deleted successfully');

    });

});

// Dashboard stats
app.get('/api/stats', isAuthenticated, (req, res) => {

    const projectSql = 'SELECT COUNT(*) AS total FROM projects';
    const messageSql = 'SELECT COUNT(*) AS total FROM contact_messages';

    db.query(projectSql, (err, projectResult) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        db.query(messageSql, (err, messageResult) => {

            if (err) {
                console.log(err);
                return res.status(500).send('Database Error');
            }

            res.json({
                projects: projectResult[0].total,
                messages: messageResult[0].total
            });

        });

    });

});

// Upload Resume
app.post('/upload-resume', isAuthenticated, upload.single('resume'), (req, res) => {

    console.log('📄 Resume uploaded');

    res.send(`
        <h2 style="color:green;text-align:center;margin-top:50px;">
            Resume uploaded successfully!
        </h2>

        <div style="text-align:center;margin-top:20px;">
            <a href="/dashboard">Back to Dashboard</a>
        </div>
    `);

});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});