<?php
/**
 * Google Gemini API Configuration
 */

class GeminiConfig {
    private static $apiKey;
    private static $apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';
    
    public static function init() {
        // Load from .env
        $envPath = __DIR__ . '/../../.env';
        if (file_exists($envPath)) {
            $env = parse_ini_file($envPath);
            self::$apiKey = $env['GEMINI_API_KEY'] ?? '';
        }
    }
    
    public static function analyzeImage($imagePath, $prompt, $timeout = 30) {
        self::init();
        
        if (empty(self::$apiKey) || self::$apiKey === 'YOUR_API_KEY_HERE') {
            return [
                'error' => true,
                'message' => 'Gemini API key not configured',
                'products' => []
            ];
        }
        
        // Read and encode image
        if (!file_exists($imagePath)) {
            return [
                'error' => true,
                'message' => 'Image file not found',
                'products' => []
            ];
        }
        
        $imageData = base64_encode(file_get_contents($imagePath));
        $mimeType = mime_content_type($imagePath);
        
        // Prepare request
        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => $imageData
                            ]
                        ]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.1,
                'topK' => 1,
                'topP' => 1,
                'maxOutputTokens' => 2048,
            ]
        ];
        
        // Make API call
        $ch = curl_init(self::$apiUrl . '?key=' . self::$apiKey);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            return [
                'error' => true,
                'message' => 'Network error: ' . $error,
                'products' => []
            ];
        }
        
        if ($httpCode !== 200) {
            $errorData = json_decode($response, true);
            $errorMsg = $errorData['error']['message'] ?? 'Unknown API error';
            return [
                'error' => true,
                'message' => 'Gemini API error: ' . $errorMsg,
                'products' => []
            ];
        }
        
        // Parse response
        $data = json_decode($response, true);
        if (!isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            return [
                'error' => true,
                'message' => 'Invalid API response format',
                'products' => []
            ];
        }
        
        $text = $data['candidates'][0]['content']['parts'][0]['text'];
        
        // Extract JSON from response
        preg_match('/\{.*\}/s', $text, $matches);
        if (!$matches) {
            return [
                'error' => true,
                'message' => 'No JSON found in response',
                'products' => []
            ];
        }
        
        $result = json_decode($matches[0], true);
        if (!$result || !isset($result['products'])) {
            return [
                'error' => true,
                'message' => 'Invalid JSON structure in response',
                'products' => []
            ];
        }
        
        return [
            'error' => false,
            'message' => 'Success',
            'products' => $result['products']
        ];
    }
}