const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
const cityTimezones = require('city-timezones');
const { connection } = require('./config');

// Function to Create New User
async function createUser(userData) {
    return new Promise((resolve, reject) => {
        const { first_name, last_name, email, birthday, city, status } = userData;
        const query = 'INSERT INTO users (first_name, last_name, email, birthday, city, status) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [first_name, last_name, email, birthday, city, status];

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
        const query = 'SELECT id, first_name, last_name, email, birthday, city, status, message_sent_status, message_sent, created_at FROM users';
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
async function deleteUser(userId) {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM users WHERE id = ?';
        connection.query(query, [userId], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
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

// Function to Recovery Seending Message
async function recoverAndResendMessages() {
    try {
        const unsentUsers = await fetchUsersWithUnsentMessages();
        for (const user of unsentUsers) {
            await sendBirthdayMessage(user, process.env.HOUR_SEND);
        }
    } catch (error) {
        console.error('Error recovering and resending messages:', error.message);
    }
}

// Function convert City into TimeZone
async function getTimeZoneByCity(cityName) {
    const cityLookup = cityTimezones.lookupViaCity(cityName)
    return cityLookup;
}

// Function to Send Birthday Message
async function sendBirthdayMessage(user, HourSend) {
    try {
        const now = moment.tz('Asia/Jakarta');
        const userTimezone = await getTimeZoneByCity(user.city);

        const userBirthday = moment.tz(user.birthday, 'YYYY-MM-DD', 'UTC');
        const userTime = userBirthday.clone().tz(userTimezone[0].timezone);

        if (
            now.isSame(userTime, 'day') &&
            now.hours() === parseInt(HourSend, 10) &&
            user.message_sent_status === 0
        ) {
            console.log('a');
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

            await updateUserMessageStatus(user.id); // Perbarui status pesan terkirim
        }
    } catch (error) {
        console.error('Error sending birthday message:', error.message);
    }
}


// Function to Update Message Status
async function updateUserMessageStatus(userId) {
    try {
        await new Promise((resolve, reject) => {
            connection.query('UPDATE users SET message_sent_status = ?, message_sent = NOW() WHERE id = ?', [true, userId], (err) => {
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

// Function to Fetch Users with Unsents Messages
async function fetchUsersWithUnsentMessages() {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM users WHERE message_sent_status = ?', [false], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Function to Check and Send Birthday Messages
async function checkAndSendBirthdayMessages() {
    const now = moment.tz('Asia/Jakarta');
    console.log(`Check ${now}`);
    try {
        const users = await fetchActiveUsers();
        for (const user of users) {
            await sendBirthdayMessage(user, process.env.HOUR_SEND);
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
    recoverAndResendMessages,
    getTimeZoneByCity,
    sendBirthdayMessage,
    updateUserMessageStatus,
    fetchUsersWithUnsentMessages,
    checkAndSendBirthdayMessages,
    fetchActiveUsers
};