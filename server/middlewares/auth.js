import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';

// Middleware to protect routes and ensure the user is authenticated
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

export const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      // Extract token
      token = req.headers.authorization.split(' ')[1];

      // Verify token and extract payload
      const decoded = jwt.verify(token, JWT_SECRET);

      // Fetch the student from DB (without password)
      req.student = await Student.findById(decoded.id).select('-password');

      if (!req.student) {
        return res
          .status(401)
          .json({ success: false, message: 'Not authorized, user not found' });
      }

      // Proceed to the next middleware/route handler
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res
        .status(401)
        .json({ success: false, message: 'Not authorized, token invalid' });
    }
  }

  // If no token was provided
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Not authorized, no token provided' });
  }
};
