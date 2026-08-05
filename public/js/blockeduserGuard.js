
(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    // Case 1: server correctly returned a 403 JSON block response
    if (response.status === 403) {
      try {
        // clone so the calling code can still read the original response
        const data = await response.clone().json();

        if (data && data.redirect === "/login") {
          sessionStorage.setItem(
            "blockedMessage",
            data.message || "Your account has been blocked by admin."
          );
          window.location.href = "/login";
          return response;
        }
      } catch (e) {
        // response wasn't JSON — not a block response, ignore
      }
    }

   
    if (
      response.redirected &&
      response.url.includes("/login") &&
      !window.location.pathname.includes("/login")
    ) {
      sessionStorage.setItem(
        "blockedMessage",
        "Your account has been blocked by admin."
      );
      window.location.href = "/login";
      return response;
    }

    return response;
  };
})();