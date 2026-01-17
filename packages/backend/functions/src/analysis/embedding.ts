/**
 * Image Embedding Generation
 * Using Vertex AI multimodalembedding@001
 * Reference: docs/dysapp_PRD.md - Section 15.9
 */

import * as aiplatform from "@google-cloud/aiplatform";
import { VERTEX_AI_REGION } from "../constants";
import { getValidatedProjectId } from "../utils/envValidation";

/**
 * Generate image embedding using Vertex AI multimodalembedding
 * Returns 1408-dimensional vector (multimodalembedding@001 default)
 * Note: Our app expects 1408 dim for this model.
 */
export async function generateImageEmbedding(
  imageData: string,
  mimeType: string
): Promise<number[]> {
  try {
    const projectId = getValidatedProjectId();
    const location = VERTEX_AI_REGION;
    const model = "multimodalembedding@001";

    // Initialize PredictionServiceClient
    // Note: Use regional endpoint
    const predictionServiceClient = new aiplatform.v1.PredictionServiceClient({
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
    });

    const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;

    // Prepare instance
    const instance = {
      image: {
        bytesBase64Encoded: imageData,
      },
    };

    const instanceValue = aiplatform.helpers.toValue(instance);
    // Fix TS error: explicit cast to any[] to match protobuf requirements
    const instances = [instanceValue] as any[];

    // Predict
    const [response] = await predictionServiceClient.predict({
      endpoint,
      instances,
    });

    if (!response.predictions || response.predictions.length === 0) {
      throw new Error("No predictions returned from Vertex AI");
    }

    // Parse prediction
    const prediction = response.predictions[0];
    // Fix TS error: cast result to any to access dynamic properties
    const predictionObj = aiplatform.helpers.fromValue(prediction as any) as any;

    // multimodalembedding@001 returns 'imageEmbedding' field
    if (predictionObj && Array.isArray(predictionObj.imageEmbedding)) {
      console.log(`[Embedding] Generated embedding with dimension: ${predictionObj.imageEmbedding.length}`);
      return predictionObj.imageEmbedding as number[];
    } else {
      console.error("[Embedding] Unexpected prediction format:", JSON.stringify(predictionObj));
      throw new Error("Invalid prediction format: missing imageEmbedding");
    }

  } catch (error) {
    console.error("[Embedding] Generation failed:", error);
    // Return empty array to allow analysis to continue even if embedding fails
    return [];
  }
}

/**
 * Generate embedding from image URL (fetch and encode)
 */
export async function generateEmbeddingFromUrl(
  imageUrl: string
): Promise<number[]> {
  try {
    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // Determine mime type from content-type header
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return generateImageEmbedding(base64Data, contentType);
  } catch (error) {
    console.error("[Embedding] URL fetch failed:", error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // Dimension mismatch handling
    // For now, return 0 if dimensions don't match (e.g. empty vs 1408)
    if (a.length === 0 || b.length === 0) return 0;
    
    console.warn(`[Embedding] Dimension mismatch in similarity check: ${a.length} vs ${b.length}`);
    return 0; 
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate cosine distance (1 - similarity)
 * Lower distance = more similar
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Normalize vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  let norm = 0;
  for (const val of vector) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);

  if (norm === 0) {
    return vector;
  }

  return vector.map((val) => val / norm);
}
