const path = require('path');
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SendgridMail = require('@sendgrid/mail')
SendgridMail.setApiKey(SENDGRID_API_KEY)
const handlebars = require("handlebars");
const fs = require("fs");

const sendMail = async (html, subject, to) => {
    const message = {
        to: to
        ,from: 'alfredo@amaranto.se'
        ,subject: subject
        ,html: html
    }
    try{
        await SendgridMail.send(message);
        return true;
    }
    catch(exception){
        console.log("Exception when sending email:",exception);
    }
}

const setMailHeaderAndFooter = () => {
    const filename_header = path.join(__dirname, "/../templates/header.handlebars");
    const filename_footer = path.join(__dirname, "/../templates/footer.handlebars");
    const header = fs.readFileSync(filename_header, "utf-8");
    const footer = fs.readFileSync(filename_footer, "utf-8");
    handlebars.registerPartial('header', header);
    handlebars.registerPartial('footer', footer);
}

exports.adminNewSignup = async (user) => {
    setMailHeaderAndFooter();
    const filename = path.join(__dirname, `/../templates/admin-new-user.handlebars`);
    const emailTemplate = fs.readFileSync(filename, "utf-8");
    const template = handlebars.compile(emailTemplate)
    const html = (template({
        name: user.name
    }));
    const to = process.env.ADMIN_MAIL_ON_NOTIFICATION;
    const subject = "New signup at loverino";
    await sendMail(html, subject, to);
};


exports.newMatchEmail = async (user) => {
    setMailHeaderAndFooter();
    const lang_config = require(`../languages/${user.language}.json`);
    const filename = path.join(__dirname, `/../templates/new-match-${user.language}.handlebars`);
    const emailTemplate = fs.readFileSync(filename, "utf-8");
    const template = handlebars.compile(emailTemplate)
    const html = (template({
        name: user.name,
        loginUrl: `${process.env.APP_URL}`
    }));
    const to = user.email;
    const subject = lang_config['NEW_MATCH_MAIL_SUBJECT'];
    await sendMail(html, subject, to);
};

exports.welcomeEmail = async (user) => {
    setMailHeaderAndFooter();
    const lang_config = require(`../languages/${user.language}.json`);
    const filename = path.join(__dirname, `/../templates/welcome-${user.language}.handlebars`);
    const emailTemplate = fs.readFileSync(filename, "utf-8");
    const template = handlebars.compile(emailTemplate)
    const html = (template({
        name: user.name,
        activationUrl: `${process.env.APP_URL}/activate/${user._id}/${user.activation_string}`
    }));
    const to = user.email;
    const subject = lang_config['WELCOME_MAIL_SUBJECT'];
    await sendMail(html, subject, to);
};


exports.forgotPasswordEmail = async (user) => {
    setMailHeaderAndFooter();
    const lang_config = require(`../languages/${user.language}.json`);
    const filename = path.join(__dirname, `/../templates/forgot-password-${user.language}.handlebars`);
    const emailTemplate = fs.readFileSync(filename, "utf-8");
    const template = handlebars.compile(emailTemplate)
    const html = (template({
        name: user.name,
        restoreUrl: `${process.env.APP_URL}/restore/${user._id}/${user.restorePasswordString}`
    }));
    const to = user.email;
    const subject = lang_config['FORGOT_PASSWORD_MAIL_SUBJECT'];
    await sendMail(html, subject, to);
};