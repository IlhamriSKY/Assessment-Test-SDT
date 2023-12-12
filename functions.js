require('dotenv').config();
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

connection.connect();

// Function to Create New User
async function createUser(userData) {
    return new Promise((resolve, reject) => {
        const { first_name, last_name, email, birthday, location, status } = userData;
        const query = 'INSERT INTO users (first_name, last_name, email, birthday, location, status) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [first_name, last_name, email, birthday, location, status];

        connection.query(query, values, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Function to check if User Exists
async function checkUserExists(userId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id FROM users WHERE id = ?';
        connection.query(query, [userId], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.length > 0);
            }
        });
    });
}

// Function to Get All Users
async function getAllUsers() {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id, first_name, last_name, email, birthday, location, status, message_sent, created_at FROM users';
        connection.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Function to Edit User
async function editUser(userId, updatedFields) {
    return new Promise((resolve, reject) => {
        const fieldKeys = Object.keys(updatedFields);
        const fieldValues = fieldKeys.map(key => updatedFields[key]);

        let query = 'UPDATE users SET ';
        query += fieldKeys.map(key => `${key} = ?`).join(', ');
        query += ' WHERE id = ?';

        connection.query(query, [...fieldValues, userId], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Function to Delete User
function deleteUser(userId) {
    const query = 'DELETE FROM users WHERE id = ?';
    connection.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
        } else {
            console.log('User deleted successfully');
        }
    });
}

// Function to Send Email Message
async function sendMessage(user, messageContent, subject) {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.SMTP_SERVICE,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: user.email,
            subject: subject,
            text: messageContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return 'Email sent successfully';
    } catch (error) {
        console.log('Error sending email:', error);
        throw new Error('Failed to send email: ' + error.message);
    }
}

// MAIN
// Function to Send Birthday Message
async function sendBirthdayMessage(user) {
    try {
        const now = moment();
        const userBirthday = moment(user.birthday);
        const userTime = moment.tz(userBirthday, user.location);

        if (
            now.isSame(userTime, 'day') &&
            now.hours() === 9 &&
            now.minutes() === 0 &&
            !user.message_sent
        ) {
            const transporter = nodemailer.createTransport({
                service: process.env.SMTP_SERVICE,
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            const mailOptions = {
                from: process.env.SMTP_FROM,
                to: user.email,
                subject: 'Happy Birthday!',
                text: `Hey, ${user.first_name} ${user.last_name}, it's your birthday!`
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);

            await updateUserMessageStatus(user.id);
        }
    } catch (error) {
        console.error('Error sending birthday message:', error.message);
    }
}

// Function to Update Message Status
async function updateUserMessageStatus(userId) {
    try {
        await new Promise((resolve, reject) => {
            connection.query('UPDATE users SET message_sent = ? WHERE id = ?', [true, userId], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Error updating message_sent status:', error.message);
    }
}

// Function to Check and Send Birthday Messages
async function checkAndSendBirthdayMessages() {
    try {
        const users = await fetchActiveUsers();
        for (const user of users) {
            await sendBirthdayMessage(user);
        }
    } catch (error) {
        console.error('Error in checking and sending birthday messages:', error.message);
    }
}

// Function to Fetch Active Users
async function fetchActiveUsers() {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM users WHERE status = ?', ['active'], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}


module.exports = {
    createUser,
    checkUserExists,
    getAllUsers,
    editUser,
    deleteUser,
    sendMessage,
    sendBirthdayMessage,
    checkAndSendBirthdayMessages
};
