const env = require("dotenv").config().parsed;
const axios = require("axios");

const BASE_URL = env.SC_BASE_URL;
const SEASON_YEAR = env.SC_SEASON_YEAR;
const TEAM_ID = env.SC_TEAM_ID;

const extractCSRFToken = (response) => response.data.match(/<meta name="csrf-token" content="(.*)"/)[1];
const replaceCookies = (cookieStore, response) => {
  response.headers["set-cookie"]
    ?.map((cookie) => cookie.split(";")[0])
    .forEach((cookie) => (cookieStore[cookie.split("=")[0]] = cookie.split("=")[1]));
};
const toCookieString = (cookieStore) =>
  Object.entries(cookieStore)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

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
      maxRedirects: 0,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients`,
        Cookie: cookies
      },
      validateStatus: (status) => status >= 200 && status <= 302
    });
  }
};
const sendUploadForm = (name, parameters, fileName, file, cookies, csrfToken) => {
  const formData = new FormData();
  formData.append("utf8", "✓");
  formData.append("authenticity_token", csrfToken);
  formData.append("client[file]", new Blob([file]), fileName);
  formData.append("client[name]", name);
  formData.append("client[parameters]", parameters);
  formData.append("client[image_name]", "openjdk:18");
  formData.append("commit", "Computerspieler erstellen");

  return axios.post(`${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients`, formData, {
    maxRedirects: 0,
    headers: {
      "Content-Type": "multipart/form-data",
      Referer: `${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients/new`,
      Cookie: cookies
    },
    validateStatus: (status) => status >= 200 && status <= 302
  });
};
const testClient = async (clientId, cookies, csrfToken) => {
  const params = new URLSearchParams();
  params.append("_method", "post");
  params.append("authenticity_token", csrfToken);
  params.append("activateClient", "true");

  return await axios.post(`${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients/${clientId}/test`, params, {
    maxRedirects: 0,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE_URL}/seasons/${SEASON_YEAR}/contestants/${TEAM_ID}/clients`,
      Cookie: cookies
    },
    validateStatus: (status) => status >= 200 && status <= 302
  });
};

const uploadClient = async (name, parameters, fileName, file) => {
  const cookieStore = {};

  // login
  const loginPage = await loadLoginPage();
  replaceCookies(cookieStore, loginPage);
  const loginResponse = await sendLoginForm(toCookieString(cookieStore), extractCSRFToken(loginPage));
  replaceCookies(cookieStore, loginResponse);

  // hide old clients
  const oldListPage = await loadListPage(toCookieString(cookieStore));
  replaceCookies(cookieStore, oldListPage);
  const oldClientIds = oldListPage.data.match(/id='client-(\d+)'/g)?.map((id) => id.match(/id='client-(\d+)'/)[1]) || [];

  if (oldClientIds.length > 0) await hideClients(oldClientIds, toCookieString(cookieStore), extractCSRFToken(oldListPage));

  // upload new client
  const uploadPage = await loadUploadPage(toCookieString(cookieStore));
  replaceCookies(cookieStore, uploadPage);
  await sendUploadForm(name, parameters, fileName, file, toCookieString(cookieStore), extractCSRFToken(uploadPage));

  // test new client
  let retries = 0;
  let newListPage, clientId;

  while (!clientId?.length && retries++ < 5) {
    newListPage = await loadListPage(toCookieString(cookieStore));
    replaceCookies(cookieStore, newListPage);

    clientId = newListPage.data.match(/id='client-(\d+)'/);

    new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (clientId?.length) await testClient(clientId[1], toCookieString(cookieStore), extractCSRFToken(newListPage));
};

module.exports = {
  uploadClient
};
