const env = require("dotenv").config().parsed;
const axios = require("axios");

const BASE_URL = "https://contest.software-challenge.de";

const extractCSRFToken = (body) => body.match(/<meta name="csrf-token" content="(.*)"/)[1];
const extractCookies = (response) => response.headers["set-cookie"].map((cookie) => cookie.split(";")[0]).join(";");

const loadLoginPage = () => axios.get(`${BASE_URL}/login`);
const loadUploadPage = (cookies) => axios.get(`${BASE_URL}/login`, { headers: { Cookie: cookies } });

const sendLoginForm = (cookies, csrfToken) => {
  const formData = new FormData();
  formData.append("utf8", "✓");
  formData.append("authenticity_token", csrfToken);
  formData.append("user[email]", env.SC_EMAIL);
  formData.append("user[password]", env.SC_PASSWORD);
  formData.append("remember_me", "yes");
  formData.append("commit", "Einloggen");

  return axios.post(`${BASE_URL}/login`, formData, {
    maxRedirects: 0,
    headers: {
      "Content-Type": "multipart/form-data",
      Cookie: cookies
    },
    validateStatus: (status) => status >= 200 && status <= 302
  });
};
const sendUploadForm = (name, file, cookies, csrfToken) => {
  const formData = new FormData();
  formData.append("utf8", "✓");
  formData.append("authenticity_token", csrfToken);
  formData.append("client[name]", name);
  formData.append("client[parameters]", "");
  formData.append("client[image_name]", "openjdk:18");
  formData.append("client[file]", new Blob([file]), "teamgruen-player.jar");
  formData.append("commit", "Computerspieler erstellen");

  return axios.post(`${BASE_URL}/seasons/2024/contestants/2374/clients`, formData, {
    maxRedirects: 0,
    headers: {
      "Content-Type": "multipart/form-data",
      Cookie: cookies
    },
    validateStatus: (status) => status >= 200 && status <= 302
  });
};

const uploadClient = async (name, file) => {
  const loginPage = await loadLoginPage();
  const loginResponse = await sendLoginForm(extractCookies(loginPage), extractCSRFToken(loginPage.data));
  const uploadPage = await loadUploadPage(extractCookies(loginResponse));
  await sendUploadForm(name, file, extractCookies(uploadPage), extractCSRFToken(uploadPage.data));
};

module.exports = {
  uploadClient
};
