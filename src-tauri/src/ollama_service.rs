use reqwest;
use serde_json::{json, Value};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelInfo {
    pub modelfile: Option<String>,
    pub parameters: Option<String>,
    pub template: Option<String>,
    pub details: Option<ModelDetails>,
    pub model_info: Option<HashMap<String, Value>>,
    pub capabilities: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelDetails {
    pub parent_model: Option<String>,
    pub format: Option<String>,
    pub family: Option<String>,
    pub families: Option<Vec<String>>,
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
}
pub struct OllamaService {
    base_url: String,
    client: reqwest::Client,
}

impl OllamaService {
    pub fn new(base_url: Option<String>) -> Self {
        let default_url = "http://localhost:11434".to_string();
        Self {
            base_url: base_url.unwrap_or(default_url),
            client: reqwest::Client::new(),
        }
    }

    pub async fn get_models(&self) -> Result<Vec<String>, String> {
        println!("Fetching available models from Ollama...");
        
        let response = self.client // GET http://localhost:11434/api/tags
            .get(&format!("{}/api/tags", self.base_url))
            .send()
            .await
            .map_err(|e| format!("Failed to get models: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("Request failed with status: {}", response.status()));
        }
        
        let json: Value = response.json().await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        
        let models: Vec<String> = json["models"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|model| model["name"].as_str().map(|s| s.to_string()))
            .collect();
        
        println!("Found {} models", models.len());
        Ok(models)
    }

    pub async fn get_model_info(&self, model_name: &str) -> Result<ModelInfo, String> {
        println!("Getting model info for: {}", model_name);
        
        let payload = json!({
            "model": model_name
        });

        let response = self.client
            .post(&format!("{}/api/show", self.base_url))
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Failed to get model info: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Request failed with status: {}", response.status()));
        }

        let model_info: ModelInfo = response.json().await
            .map_err(|e| format!("Failed to parse model info response: {}", e))?;

        println!("Successfully retrieved model info for: {}", model_name);
        Ok(model_info)
    }

    pub async fn generate_stream(
        &self,
        model: &str,
        prompt: &str,
        context: Option<Vec<u8>>,
        system: Option<&str>,
        template: Option<&str>,
        images: Option<Vec<String>>,
        raw: Option<bool>,
        format: Option<&str>,
        options: Option<HashMap<String, Value>>,
    ) -> Result<reqwest::Response, String> {
        println!("Generating stream for model: {} with prompt length: {}", model, prompt.len());
        
        let mut payload = json!({
            "model": model,
            "prompt": prompt,
            "stream": true
        });

        // Only add optional fields if they have values
        if let Some(ctx) = context {
            payload["context"] = json!(ctx);
        }
        if let Some(sys) = system {
            payload["system"] = json!(sys);
        }
        if let Some(tmpl) = template {
            payload["template"] = json!(tmpl);
        }
        if let Some(imgs) = images {
            payload["images"] = json!(imgs);
        }
        if let Some(r) = raw {
            payload["raw"] = json!(r);
        }
        if let Some(fmt) = format {
            payload["format"] = json!(fmt);
        }
        if let Some(opts) = options {
            payload["options"] = json!(opts);
        }

        println!("Sending request to {}/api/generate", self.base_url);
        println!("Payload: {}", serde_json::to_string_pretty(&payload).unwrap_or_default());
    
        let response = self.client
            .post(&format!("{}/api/generate", self.base_url))
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                let error_msg = format!("Failed to send request: {}", e);
                println!("{}", error_msg);
                error_msg
            })?;
    
        println!("Got response with status: {}", response.status());
        
        if !response.status().is_success() {
            let error_msg = format!("Request failed with status: {}", response.status());
            println!("{}", error_msg);
            return Err(error_msg);
        }
    
        println!("Response successful, returning stream");
        Ok(response)
    }

    pub async fn check_health(&self) -> bool {
        match self.client // GET http://localhost:11434/api/tags
            .get(&format!("{}/api/tags", self.base_url))
            .send()
            .await 
        {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }
}