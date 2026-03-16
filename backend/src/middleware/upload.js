import multer from 'multer';

const fileFilter = (_req, file, cb) => {
  if (file.originalname.endsWith('.md') || file.originalname.endsWith('.zip')) cb(null, true);
  else cb(new Error('Only .md or .zip files are accepted'), false);
};

export default multer({ storage: multer.memoryStorage(), fileFilter });
