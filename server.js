require('dotenv').config();
console.log("SERVER FILE LOADED");

const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const geoip = require('geoip-lite');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const certificateStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "PARMAR/certificates",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"]
    }
});

const projectStorageCloud = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "PARMAR/projects",
        resource_type: "image"
    })
});

const projectGalleryStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "PARMAR/project-gallery",
        resource_type: "image"
    })
});

const uploadProjectGalleryCloud = multer({
    storage: projectGalleryStorage
});

const reportStorageCloud = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "PARMAR/reports",
        resource_type: "image",
        type: "upload"
    })
});

const uploadCertificateCloud = multer({
    storage: certificateStorage
});

const uploadProjectCloud = multer({
    storage: projectStorageCloud
});

const uploadGalleryCloud = multer({
    storage: projectStorageCloud
});

const uploadReportCloud = multer({
    storage: reportStorageCloud
});

const app = express();

app.use((req,res,next)=>{
    console.log("GLOBAL REQUEST:", req.method, req.url);
    next();
});

app.get('/test-api', (req, res) => {
    res.send("API WORKING");
});

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
// Upload storage (Resume, Projects, Certificates)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {

        // Resume upload
        if (req.originalUrl.includes('upload-resume')) {
            cb(null, 'uploads/');
        }

        // Certificate upload
        else if (req.originalUrl.includes('certificate')) {

    const fs = require('fs');

    // Folder nahi hai to bana do
    if (!fs.existsSync('uploads/certificates')) {
        fs.mkdirSync('uploads/certificates', { recursive: true });
    }

    cb(null, 'uploads/certificates');
}

        // Project upload
        else {
            cb(null, 'uploads/projects');
        }
    },

    filename: (req, file, cb) => {

        // Resume ka naam fixed rahega
        if (req.originalUrl.includes('upload-resume')) {
            cb(null, 'resume.pdf');
        }

        // Projects aur Certificates ke liye unique naam
        else {
            cb(null, Date.now() + '-' + file.originalname);
        }
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

// Profile photo storage
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'assets/images/');
    },
    filename: (req, file, cb) => {
        cb(null, 'profile.jpg'); // hamesha same naam
    }
});

const uploadProfile = multer({ storage: profileStorage });


// Report PDF storage
// Report PDF storage
const fs = require('fs');

const reportStorage = multer.diskStorage({
    destination: (req, file, cb) => {

        // reports folder nahi hai to bana do
        if (!fs.existsSync('uploads/reports')) {
            fs.mkdirSync('uploads/reports', { recursive: true });
        }

        cb(null, 'uploads/reports/');
    },

    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const uploadReport = multer({ storage: reportStorage });
const uploadProject = multer({ storage: projectStorage });

// Uploads folder public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Visitor Tracking Middleware

app.use((req, res, next) => {

    console.log("🔥 REQUEST RECEIVED:", req.method, req.path);

    // Same browser session ko baar-baar count nahi karna


    // tumhara baki visitor code yaha hai

    // Ignore API and Admin requests
if(
    req.path.startsWith('/api') ||
    req.path.startsWith('/uploads') ||
    req.path.includes('dashboard') ||
    req.path.includes('admin') ||
    req.path.includes('login') ||
    req.path.includes('logout') ||
    req.path.endsWith('.html') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.jpg') ||
    req.path.endsWith('.png') ||
    req.path === '/favicon.ico'
){
    return next();
}



    // Static files ko count nahi karna
    if(
        req.url.includes('.css') ||
        req.url.includes('.js') ||
        req.url.includes('.jpg') ||
        req.url.includes('.png') ||
        req.url.includes('.pdf')
    ){
        return next();
    }


    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    let visitorIP = ip;

if(visitorIP === "::1"){
    visitorIP = "127.0.0.1";
}

const location = geoip.lookup(visitorIP);

const city = location ? location.city : "Unknown";
const country = location ? location.country : "Unknown";

    const userAgent = req.headers['user-agent'] || 'Unknown';


    let device = "Desktop";

    if(/mobile/i.test(userAgent)){
        device = "Mobile";
    }


    let browser = "Unknown";

    if(userAgent.includes("Chrome")){
        browser = "Chrome";
    }
    else if(userAgent.includes("Edg")){
        browser = "Edge";
    }
    else if(userAgent.includes("Firefox")){
        browser = "Firefox";
    }


    let os = "Unknown";

    if(userAgent.includes("Windows")){
        os = "Windows";
    }
    else if(userAgent.includes("Android")){
        os = "Android";
    }
    else if(userAgent.includes("iPhone")){
        os = "iOS";
    }

    if(req.path === "/favicon.ico"){
    return next();
}

    console.log("SAVING VISITOR PAGE:", req.path);

    const page = req.path;

    if(page !== "/"){
    return next();
}


    const sql = `
INSERT INTO visitors 
(ip_address, city, country, device, browser, os, page, visit_date)

SELECT ?,?,?,?,?,?, ?, CURDATE()

WHERE NOT EXISTS (

SELECT 1 FROM visitors

WHERE ip_address = ?

AND visit_date = CURDATE()

)
`;



db.query(
    sql,
    [
    visitorIP,
    city,
    country,
    device,
    browser,
    os,
    page,
    visitorIP
],
    (err) => {
        if (err) {
            console.log("Visitor Save Error:", err);
        } else {
            console.log("Visitor Saved:", visitorIP, city, country, page);
        }
    }
);



    next();

});

// MySQL connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Connect to MySQL


// Connect database


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
app.post('/add-project', isAuthenticated, uploadProjectCloud.single('image'), (req, res) => {

    const { title, technology, description, github, demo } = req.body;

    const image = req.file ? req.file.path : null;

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

// Upload Project Gallery Image
app.post(
    '/upload-project-gallery',
    isAuthenticated,
    uploadProjectGalleryCloud.single('image'),
    (req, res) => {

        console.log("Gallery Image:", req.file);

        const { project_id, title, description } = req.body;

        const image = req.file ? req.file.path : null;

        if (!image) {
            return res.status(400).send("Image upload failed");
        }

        const sql = `
            INSERT INTO project_images
            (project_id, title, description, image)
            VALUES (?, ?, ?, ?)
        `;

        db.query(
            sql,
            [project_id, title, description, image],
            (err, result) => {

                if (err) {
                    console.log(err);
                    return res.status(500).send("Database Error");
                }

                console.log("🖼 Gallery Image Uploaded");

                res.send("Gallery Image Uploaded Successfully");
            }
        );

    }
);

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

// Get Gallery Images by Project
app.get('/api/project-images/:projectId', (req, res) => {

    const projectId = req.params.projectId;

    const sql = `
        SELECT *
        FROM project_images
        WHERE project_id = ?
        ORDER BY id ASC
    `;

    db.query(sql, [projectId], (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json([]);
        }

        res.json(results);

    });

});

// Change Password
app.post('/change-password', isAuthenticated, (req, res) => {

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.send('New passwords do not match');
    }

    const sql = 'SELECT * FROM admins WHERE email = ?';

    db.query(sql, [req.session.user.email], async (err, results) => {

        if (err) return res.send('Database Error');

        if (results.length === 0) return res.send('Admin not found');

        const admin = results[0];

        const match = await bcrypt.compare(currentPassword, admin.password);

        if (!match) {
            return res.send('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
            'UPDATE admins SET password = ? WHERE id = ?',
            [hashedPassword, admin.id],
            (err) => {

                if (err) return res.send('Error updating password');

                res.send(`
                    <h2 style="color:green;text-align:center;margin-top:50px;">
                        Password updated successfully!
                    </h2>
                    <div style="text-align:center;margin-top:20px;">
                        <a href="/dashboard">Back to Dashboard</a>
                    </div>
                `);
            }
        );
    });

});


// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
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

// ==================== CERTIFICATES ====================

// Add certificate
app.post('/add-certificate', isAuthenticated, uploadCertificateCloud.single('certificate'), (req, res) => {

    const { title, issuer } = req.body;
    const image = req.file ? req.file.path : null;

    const sql = `
        INSERT INTO certificates (title, issuer, image)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [title, issuer, image], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        console.log('📜 Certificate added:', title);

        res.send(`
            <h2 style="color:green;text-align:center;margin-top:50px;">
                Certificate added successfully!
            </h2>
            <div style="text-align:center;margin-top:20px;">
                <a href="/upload-certificate.html">Upload Another</a>
            </div>
        `);

    });

});

// Get all certificates
app.get('/api/certificates', (req, res) => {

    const sql = 'SELECT * FROM certificates ORDER BY created_at DESC';

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Database Error');
        }

        res.json(results);

    });

});

// Delete certificate
app.delete('/delete-certificate/:id', isAuthenticated, (req, res) => {

    const certificateId = req.params.id;

    const sql = 'DELETE FROM certificates WHERE id = ?';

    db.query(sql, [certificateId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error deleting certificate');
        }

        console.log('🗑️ Certificate deleted:', certificateId);

        res.send('Certificate deleted successfully');

    });

});

// Update certificate
app.put('/update-certificate/:id', isAuthenticated, (req, res) => {

    const certificateId = req.params.id;
    const { title, issuer } = req.body;

    const sql = `
        UPDATE certificates
        SET title = ?, issuer = ?
        WHERE id = ?
    `;

    db.query(sql, [title, issuer, certificateId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error updating certificate');
        }

        console.log('✏️ Certificate updated:', certificateId);

        res.send('Certificate updated successfully');

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

// Visitor Stats API
app.get('/api/visitor-stats', (req,res)=>{

    const todaySql = `
        SELECT COUNT(*) AS total 
        FROM visitors 
        WHERE DATE(created_at) = CURDATE()
    `;

    const weekSql = `
        SELECT COUNT(*) AS total 
        FROM visitors 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    const totalSql = `
        SELECT COUNT(*) AS total 
        FROM visitors
    `;


    db.query(todaySql, (err, todayResult) => {

        if(err){
            console.log(err);
            return res.status(500).json({});
        }


        db.query(weekSql, (err, weekResult) => {

            if(err){
                console.log(err);
                return res.status(500).json({});
            }


            db.query(totalSql, (err, totalResult) => {

                if(err){
                    console.log(err);
                    return res.status(500).json({});
                }


                res.json({

                    today: todayResult[0].total,
                    week: weekResult[0].total,
                    total: totalResult[0].total

                });


            });


        });


    });


});

console.log("Recent visitors API loaded");

// Recent Visitors API
app.get('/api/recent-visitors', isAuthenticated, (req,res)=>{

    const sql = `
        SELECT *
        FROM visitors
        ORDER BY created_at DESC
        LIMIT 10
    `;


    db.query(sql,(err,result)=>{

        if(err){
            console.log(err);
            return res.status(500).json([]);
        }


        res.json(result);

    });


});

// Upload Report
app.post('/upload-report', isAuthenticated, uploadReportCloud.single('report'), (req, res) => {

    console.log("Cloudinary file:", req.file);

    const { title, description } = req.body;

    const file = req.file ? req.file.path : null;

    const sql = `
        INSERT INTO reports (title, description, file)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [title, description, file], (err, result) => {

        if (err) {
            console.log(err);
            return res.send('Error uploading report');
        }

        console.log('📄 Report uploaded:', title);

        res.send('Report uploaded successfully');

    });

});

// Get all reports
app.get('/api/reports', (req, res) => {

    db.query(
        'SELECT * FROM reports ORDER BY created_at DESC',
        (err, results) => {

            if (err) {
                console.log(err);
                return res.status(500).json([]);
            }

            res.json(results);

        }
    );

});

// Update report
app.put('/update-report/:id', isAuthenticated, (req, res) => {

    const reportId = req.params.id;
    const { title, description } = req.body;

    const sql = `
        UPDATE reports
        SET title = ?, description = ?
        WHERE id = ?
    `;

    db.query(sql, [title, description, reportId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error updating report');
        }

        console.log('✏️ Report updated:', reportId);

        res.send('Report updated successfully');

    });

});

// Delete report
app.delete('/delete-report/:id', isAuthenticated, (req, res) => {

    const reportId = req.params.id;

    const sql = 'DELETE FROM reports WHERE id = ?';

    db.query(sql, [reportId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error deleting report');
        }

        console.log('🗑️ Report deleted:', reportId);

        res.send('Report deleted successfully');

    });

});

// =========================
// Skills API
// =========================

// Get all skills
app.get('/api/skills', (req, res) => {

    const sql = 'SELECT * FROM skills ORDER BY id DESC';

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Database Error' });
        }

        res.json(results);

    });

});

// Add new skill
app.post('/add-skill', isAuthenticated, (req, res) => {

    const { title, description } = req.body;

    const sql = `
        INSERT INTO skills (title, description)
        VALUES (?, ?)
    `;

    db.query(sql, [title, description], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error adding skill');
        }

        console.log('➕ New Skill Added:', title);

        res.send('Skill added successfully');

    });

});

// Update skill
app.put('/update-skill/:id', isAuthenticated, (req, res) => {

    const skillId = req.params.id;
    const { title, description } = req.body;

    const sql = `
        UPDATE skills
        SET title = ?, description = ?
        WHERE id = ?
    `;

    db.query(sql, [title, description, skillId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error updating skill');
        }

        console.log('✏️ Skill updated:', skillId);

        res.send('Skill updated successfully');

    });

});

// Delete skill
app.delete('/delete-skill/:id', isAuthenticated, (req, res) => {

    const skillId = req.params.id;

    const sql = 'DELETE FROM skills WHERE id = ?';

    db.query(sql, [skillId], (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).send('Error deleting skill');
        }

        console.log('🗑️ Skill deleted:', skillId);

        res.send('Skill deleted successfully');

    });

});



// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});


setInterval(() => {
    console.log("SERVER ALIVE");
}, 5000);