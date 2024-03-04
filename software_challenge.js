const env = require("dotenv").config().parsed;
const axios = require("axios");

const BASE_URL = "https://contest.software-challenge.de";
const SEASON_YEAR = 2024;
const TEAM_ID = 2374;

const extractCSRFToken = (response) => response.data.match(/<meta name="csrf-token" content="(.*)"/)[1];
const extractCookies = (response) => response.headers["set-cookie"].map((cookie) => cookie.split(";")[0]).join(";");

const loadLoginPage = () => axios.get(`${BASE_URL}/login`);
const loadUploadPage = (cookies) => axios.get(`${BASE_URL}/login`, { headers: { Cookie: cookies } });
const loadListPage = (cookies) =>
  axios.get(`${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients`, { headers: { Cookie: cookies } });

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
const hideClients = async (clientIds, cookies, csrfToken) => {
  const params = new URLSearchParams();
  params.append("_method", "post");
  params.append("authenticity_token", csrfToken);

  for (const client of clientIds) {
    await axios.post(`${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients/${client}/hide`, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies
      }
    });
  }
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

  return axios.post(`${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients`, formData, {
    maxRedirects: 0,
    headers: {
      "Content-Type": "multipart/form-data",
      Cookie: cookies
    },
    validateStatus: (status) => status >= 200 && status <= 302
  });
};
const testClient = async (clientId, cookies, csrfToken) => {
  const params = new URLSearchParams();
  params.append("_method", "post");
  params.append("authenticity_token", csrfToken);

  await axios.post(`${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients/${clientId}/test`, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies
    }
  });
};

const uploadClient = async (name, file) => {
  // login
  const loginPage = await loadLoginPage();
  const loginResponse = await sendLoginForm(extractCookies(loginPage), extractCSRFToken(loginPage));
  const authCookies = extractCookies(loginResponse);

  // hide old clients
  const oldListPage = await loadListPage(authCookies);
  const oldClientIds = oldListPage.data.match(/id="client-(\d+)"/g).map((id) => id.match(/id="client-(\d+)"/)[1]);
  await hideClients(oldClientIds, authCookies, extractCSRFToken(oldListPage));

  // upload new client
  const uploadPage = await loadUploadPage(authCookies);
  await sendUploadForm(name, file, extractCookies(uploadPage), extractCSRFToken(uploadPage));

  // test new client
  const newListPage = await loadListPage(authCookies);
  const newClientId = newListPage.data.match(/id="client-(\d+)"/)[1];
  await testClient(newClientId, authCookies, extractCSRFToken(newListPage));
};

module.exports = {
  uploadClient
};
