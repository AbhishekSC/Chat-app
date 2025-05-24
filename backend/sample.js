function validateSignupInput(fullName, email, password) {
  // Check if all fields are provided
  if (!fullName || !email || !password) {
    return {
      success: false,
      message: "All fields are required",
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: "Please provide a valid email address",
    };
  }

  // Check password length
  if (password.length < 6) {
    return {
      success: false,
      message: "Password must be at least 6 characters long",
    };
  }
}




//TLS issue Cloudinary
// Looking at your server.js file, I now have a complete picture of your application. Let's implement the simplest solution for your development environment to fix the Cloudinary certificate issue.
// Since you're using ES modules (import/export), I'll show you how to set up the development server properly:
// Option 1: Create a dev-server.js file

// Create a new file called dev-server.js in the same directory as your server.js:

// javascript// dev-server.js
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// // Use dynamic import for ES modules
// import('./server.js').catch(err => {
//   console.error('Failed to import server:', err);
// });

// Run your server using this file:

// node dev-server.js
// Option 2: Modify your package.json
// Add a new script in your package.json:
// json"scripts": {
//   "start": "node server.js",
//   "dev": "cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 node server.js"
// }
// Then install cross-env:
// npm install --save-dev cross-env