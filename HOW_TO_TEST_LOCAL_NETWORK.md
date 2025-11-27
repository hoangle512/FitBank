To test your API on a local network, follow these steps:

1.  **Find your local IP address:**
    *   **On macOS/Linux:** Open your terminal and run `ipconfig getifaddr en0` (for Wi-Fi) or `ifconfig`. Look for an IP address usually starting with `192.168.` or `10.0.`.
    *   **On Windows:** Open Command Prompt and run `ipconfig`. Look for "IPv4 Address" under your active network adapter.

2.  **Modify your `dev` script:**
    By default, `next dev` binds to `localhost`, making it inaccessible from other devices on your network. To allow access, you need to tell Next.js to bind to all network interfaces (`0.0.0.0`).
    Open your `package.json` file and change the `dev` script from:
    ```json
    "dev": "next dev"
    ```
    to:
    ```json
    "dev": "next dev --hostname 0.0.0.0"
    ```
    After making this change, restart your development server (`npm run dev`).

3.  **Check firewall settings (if necessary):**
    Your operating system's firewall might be blocking incoming connections to the port your Next.js server is running on (typically `3000`). If you encounter connection issues, you might need to:
    *   Temporarily disable your firewall (not recommended for long-term use).
    *   Add an inbound rule to your firewall to allow connections to TCP port `3000` (or your server's port).

4.  **Access from another device:**
    Once your server is running with the `--hostname 0.0.0.0` flag, you can access your API from any other device connected to the same local network. Replace `YOUR_LOCAL_IP_ADDRESS` with the IP address you found in step 1.

    For example, to access the `/api/heart-rate` endpoint:
    `http://YOUR_LOCAL_IP_ADDRESS:3000/api/heart-rate`

    You can use tools like `curl`, Postman, or a web browser on another device to send requests to this address.
