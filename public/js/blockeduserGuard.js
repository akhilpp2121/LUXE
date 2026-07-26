
(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    if (response.status === 403) {
      try {
        // clone so the calling code can still read the original response
        const data = await response.clone().json();

        if (data && data.redirect === "/login") {
          sessionStorage.setItem(
            "blockedMessage",
            data.message || "Your account has been blocked by the admin"
          );
          window.location.href = "/login";
          return response;
        }
      } catch (e) {
        // response wasn't JSON — not a block response, ignore
      }
    }

    return response;
  };
})();