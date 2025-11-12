-- Création des tables pour l'application d'analyse de dessins techniques

-- Table pour les profils clients
CREATE TABLE IF NOT EXISTS client_profiles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    materials JSON,
    formulas JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table pour les résultats d'analyse
CREATE TABLE IF NOT EXISTS analysis_results (
    id VARCHAR(255) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    client_profile_id VARCHAR(255),
    raw_data JSON,
    extracted_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_profile_id) REFERENCES client_profiles(id)
);

-- Table pour les calculs d'estimation
CREATE TABLE IF NOT EXISTS calculation_results (
    id VARCHAR(255) PRIMARY KEY,
    analysis_result_id VARCHAR(255),
    pieces_per_bar INT,
    estimated_cost DECIMAL(10,2),
    selected_material JSON,
    applied_formula JSON,
    calculation_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_result_id) REFERENCES analysis_results(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_client_profiles_name ON client_profiles(name);
CREATE INDEX IF NOT EXISTS idx_analysis_results_client ON analysis_results(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_calculation_results_analysis ON calculation_results(analysis_result_id);
