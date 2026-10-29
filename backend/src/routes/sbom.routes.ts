import { Router, Request, Response } from 'express';
import multer from 'multer';
import { resolveBackendSbom } from '../services/sbomEngine';

export const sbomRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for large enterprise SBOMs
});

/**
 * POST /api/sbom/resolve
 * Accepts multipart file or JSON body and returns resolved SBOM + stats
 */
sbomRouter.post('/resolve', upload.single('file'), (req: Request, res: Response) => {
  try {
    let sbomJson: any = null;

    if (req.file) {
      const text = req.file.buffer.toString('utf8');
      sbomJson = JSON.parse(text);
    } else if (req.body && req.body.sbom) {
      sbomJson = typeof req.body.sbom === 'string' ? JSON.parse(req.body.sbom) : req.body.sbom;
    } else if (req.body && (req.body.bomFormat || req.body.components)) {
      sbomJson = req.body;
    } else {
      return res.status(400).json({
        success: false,
        error: 'No SBOM provided. Send a file via form-data or JSON body.',
      });
    }

    const customRules = req.body && req.body.customRules ? req.body.customRules : [];
    const result = resolveBackendSbom(sbomJson, customRules);

    res.json({
      success: true,
      stats: result.stats,
      components: result.components,
      resolvedBom: result.resolvedBom,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process SBOM file.',
    });
  }
});
