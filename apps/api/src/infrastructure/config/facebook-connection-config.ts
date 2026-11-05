export function facebookConnectionConfig(env: NodeJS.ProcessEnv = process.env) {
  const {
    META_FACEBOOK_APP_ID,
    META_FACEBOOK_APP_SECRET,
    META_FACEBOOK_LOGIN_CONFIG_ID,
    META_FACEBOOK_GRAPH_VERSION,
    META_FACEBOOK_REDIRECT_URI,
    META_FACEBOOK_TOKEN_KEY,
  } = env;
  if (
    !META_FACEBOOK_APP_ID ||
    !/^\d+$/.test(META_FACEBOOK_APP_ID) ||
    !META_FACEBOOK_APP_SECRET ||
    (META_FACEBOOK_LOGIN_CONFIG_ID &&
      !/^\d+$/.test(META_FACEBOOK_LOGIN_CONFIG_ID)) ||
    !META_FACEBOOK_GRAPH_VERSION ||
    !/^v\d+\.\d+$/.test(META_FACEBOOK_GRAPH_VERSION) ||
    !META_FACEBOOK_REDIRECT_URI ||
    !META_FACEBOOK_TOKEN_KEY ||
    !/^[\da-f]{64}$/i.test(META_FACEBOOK_TOKEN_KEY)
  )
    return null;
  const redirect = URL.parse(META_FACEBOOK_REDIRECT_URI);
  if (
    !redirect ||
    (redirect.protocol !== "https:" &&
      !(
        redirect.protocol === "http:" &&
        env.APP_ENV !== "production" &&
        ["localhost", "127.0.0.1"].includes(redirect.hostname)
      )) ||
    redirect.pathname !== "/agent/marketing/facebook/callback" ||
    redirect.username ||
    redirect.password ||
    redirect.search ||
    redirect.hash
  )
    return null;
  return {
    appId: META_FACEBOOK_APP_ID,
    appSecret: META_FACEBOOK_APP_SECRET,
    ...(META_FACEBOOK_LOGIN_CONFIG_ID
      ? { loginConfigId: META_FACEBOOK_LOGIN_CONFIG_ID }
      : {}),
    apiVersion: META_FACEBOOK_GRAPH_VERSION,
    redirectUri: redirect.href,
    key: Buffer.from(META_FACEBOOK_TOKEN_KEY, "hex"),
  };
}
