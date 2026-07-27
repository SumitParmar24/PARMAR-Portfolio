require('dotenv').config();

console.log("SERVER FILE LOADED");

const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const geoip = require('geoip-lite');
const fs = require('fs');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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
    cloudinary: cloudinary,
    params: {
        folder: "PARMAR/projects",
        allowed_formats: ["jpg", "jpeg", "png", "webp"]
    }
});

const reportStorageCloud = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "PARMAR/reports",
        allowed_formats: ["pdf"]
    }
});

const uploadCertificateCloud = multer({
    storage: certificateStorage
});

const uploadProjectCloud = multer({
    storage: projectStorageCloud
});

const uploadReportCloud = multer({
    storage: reportStorageCloud
});

const app = express();

const PORT = 3000;




// =======================
// Basic Middleware
// =======================

app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.use(session({
    secret:"parmar_secret_key",
    resave:false,
    saveUninitialized:false
}));


// Static files
app.use(express.static(__dirname));


// Upload folder
app.use(
    '/uploads',
    express.static(path.join(__dirname,'uploads'))
);


// =======================
// MySQL Connection
// =======================

const db = mysql.createPool({

    host:process.env.DB_HOST,
    port:process.env.DB_PORT || 3306,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME,

    ssl:{
        rejectUnauthorized:false
    },

    waitForConnections:true,
    connectionLimit:10

});

console.log("MYSQL POOL READY");



// =======================
// Visitor Tracking
// =======================


app.use((req,res,next)=>{


    // Ignore unwanted requests

    if(
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.includes('.') ||
        req.path.includes('dashboard') ||
        req.path.includes('login') ||
        req.path.includes('logout')
    ){

        return next();

    }



    const ip =
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress;



    let visitorIP = ip;


    if(visitorIP === "::1"){
        visitorIP="127.0.0.1";
    }



    const location = geoip.lookup(visitorIP);


    const city =
    location ? location.city : "Unknown";


    const country =
    location ? location.country : "Unknown";



    const userAgent =
    req.headers['user-agent'] || "Unknown";



    let device="Desktop";

    if(/mobile/i.test(userAgent)){
        device="Mobile";
    }



    let browser="Unknown";


    if(userAgent.includes("Chrome")){
        browser="Chrome";
    }
    else if(userAgent.includes("Edg")){
        browser="Edge";
    }
    else if(userAgent.includes("Firefox")){
        browser="Firefox";
    }



    let os="Unknown";


    if(userAgent.includes("Windows")){
        os="Windows";
    }
    else if(userAgent.includes("Android")){
        os="Android";
    }
    else if(userAgent.includes("iPhone")){
        os="iOS";
    }



    const page=req.path;



    const sql=`

    INSERT INTO visitors
    (
    ip_address,
    city,
    country,
    device,
    browser,
    os,
    page,
    visit_date
    )

    VALUES
    (?,?,?,?,?,?,?,CURDATE())

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
            page
        ],

        (err)=>{

            if(err){

                console.log(
                    "Visitor Error:",
                    err.message
                );

            }
            else{

                console.log(
                    "Visitor Saved:",
                    page
                );

            }

        }
    );


    next();


});



console.log("VISITOR SYSTEM READY");



// =======================
// Test API
// =======================

app.get('/test-api',(req,res)=>{

    res.send("API WORKING");

});

// =======================
// Authentication
// =======================


function isAuthenticated(req,res,next){

    if(req.session.user){

        next();

    }
    else{

        if(req.accepts('html')){

            return res.redirect('/login.html');

        }

        return res.status(401).send("Unauthorized");

    }

}



// =======================
// Home Page
// =======================

app.get('/',(req,res)=>{

    res.sendFile(
        path.join(__dirname,'index.html')
    );

});




// Login Page

app.get('/login',(req,res)=>{

    res.sendFile(
        path.join(__dirname,'login.html')
    );

});




// =======================
// Login System
// =======================


app.post('/login',(req,res)=>{


    const {email,password}=req.body;



    const sql=
    "SELECT * FROM admins WHERE email=?";



    db.query(
        sql,
        [email],

        async(err,result)=>{


            if(err){

                console.log(err);
                return res.send("Database Error");

            }



            if(result.length===0){

                return res.send(
                    "Invalid Email or Password"
                );

            }



            const admin=result[0];



            const match =
            await bcrypt.compare(
                password,
                admin.password
            );



            if(match){


                req.session.user={

                    id:admin.id,
                    email:admin.email

                };


                res.redirect('/dashboard');


            }
            else{

                res.send(
                    "Invalid Email or Password"
                );

            }


        }
    );


});




// =======================
// Dashboard
// =======================


app.get('/dashboard',
isAuthenticated,

(req,res)=>{


    res.sendFile(
        path.join(__dirname,'dashboard.html')
    );


});

// =======================
// Projects API
// =======================


// Get Projects
app.get('/api/projects',(req,res)=>{

    db.query(
        "SELECT * FROM projects ORDER BY id DESC",

        (err,result)=>{

            if(err){

                console.log(err);
                return res.status(500).json([]);

            }


            res.json(result);

        }
    );

});



// Add Project

app.post('/add-project',
isAuthenticated,
(req,res)=>{


    const {
        title,
        technology,
        description,
        github,
        demo,
        image
    } = req.body;



    const sql=`

    INSERT INTO projects
    (
    title,
    technology,
    description,
    github,
    demo,
    image
    )

    VALUES(?,?,?,?,?,?)

    `;



    db.query(
        sql,
        [
            title,
            technology,
            description,
            github,
            demo,
            image
        ],

        (err)=>{


            if(err){

                console.log(err);
                return res.send("Project Error");

            }


            res.send(
                "Project Added Successfully"
            );


        }
    );


});




// =======================
// Contact Messages
// =======================


app.post('/contact',(req,res)=>{


    const {
        name,
        email,
        subject,
        message

    } = req.body;



    const sql=`

    INSERT INTO contact_messages
    (
    name,
    email,
    subject,
    message
    )

    VALUES(?,?,?,?)

    `;



    db.query(
        sql,
        [
            name,
            email,
            subject,
            message
        ],

        (err)=>{


            if(err){

                console.log(err);
                return res.send(
                    "Message Error"
                );

            }



            res.send(
                "Message Sent Successfully"
            );


        }
    );


});



// Get Messages

app.get('/api/messages',
isAuthenticated,

(req,res)=>{


    db.query(

        "SELECT * FROM contact_messages ORDER BY id DESC",

        (err,result)=>{


            if(err){

                return res.status(500).json([]);

            }


            res.json(result);


        }

    );


});

// =======================
// Visitor Stats API
// =======================

app.get('/api/visitor-stats',(req,res)=>{


    const today = `
    SELECT COUNT(*) AS total 
    FROM visitors 
    WHERE visit_date = CURDATE()
    `;


    const week = `
    SELECT COUNT(*) AS total 
    FROM visitors
    WHERE visit_date >= DATE_SUB(CURDATE(),INTERVAL 7 DAY)
    `;


    const total = `
    SELECT COUNT(*) AS total 
    FROM visitors
    `;



    db.query(today,(err,todayResult)=>{

        if(err) return res.json({});


        db.query(week,(err,weekResult)=>{

            if(err) return res.json({});


            db.query(total,(err,totalResult)=>{


                if(err) return res.json({});



                res.json({

                    today:todayResult[0].total,
                    week:weekResult[0].total,
                    total:totalResult[0].total

                });


            });


        });


    });


});




// Recent Visitors

app.get('/api/recent-visitors',
isAuthenticated,

(req,res)=>{


    db.query(

        `
        SELECT *
        FROM visitors
        ORDER BY id DESC
        LIMIT 10
        `,


        (err,result)=>{


            if(err){

                return res.json([]);

            }


            res.json(result);


        }


    );


});




// Logout

app.get('/logout',(req,res)=>{


    req.session.destroy(()=>{

        res.redirect('/login.html');

    });


});




// =======================
// SERVER START
// =======================


app.listen(PORT,()=>{

    console.log(
        `🚀 Server running at http://localhost:${PORT}`
    );

});