/**
 * Complete Relational Database Schema (PostgreSQL) for F&B Catering Tracker
 * 
 * Features:
 * - Direct tracking of area scores over time across periods and visits.
 * - Explicit linking of staff member names and descriptions directly to service narratives and criteria.
 * - Natasha's Law / Food Safety allergen enquiry compliance tracking.
 * - Generated columns and analytical views for rapid reporting.
 */

export const POSTGRES_DDL_SCHEMA = `-- ========================================================================
-- F&B CATERING MYSTERY SHOPPER PERFORMANCE TRACKER - DATABASE SCHEMA
-- Target Engine: PostgreSQL 14+ / Supabase / Neon / Google Cloud SQL
-- All naming and comments follow UK English standards.
-- ========================================================================

-- Enable UUID extension for robust distributed primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. F&B CATERING AREAS (REFERENCE TABLE)
-- ------------------------------------------------------------------------
CREATE TABLE fb_areas (
    area_id VARCHAR(50) PRIMARY KEY,              -- 'food_hall', 'backlot', 'butterbeer'
    area_name VARCHAR(100) NOT NULL UNIQUE,       -- 'F&B: Food Hall', 'F&B: Backlot', 'F&B: Butterbeer'
    short_name VARCHAR(50) NOT NULL,              -- 'Food Hall', 'Backlot', 'Butterbeer'
    max_standard_score INTEGER NOT NULL,          -- Standard section denominator (e.g. 56 or 57)
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed predefined Catering areas
INSERT INTO fb_areas (area_id, area_name, short_name, max_standard_score, description)
VALUES 
    ('food_hall', 'F&B: Food Hall', 'Food Hall', 56, 'Main restaurant concourse near tour entrance; hot meals, bakery, and drinks.'),
    ('backlot', 'F&B: Backlot', 'Backlot', 57, 'Mid-tour catering pavilion; burger meals, wings, fries, and butterbeer offerings.'),
    ('butterbeer', 'F&B: Butterbeer', 'Butterbeer', 56, 'Dedicated Butterbeer and specialist confectionery and beverage station.')
ON CONFLICT (area_id) DO NOTHING;

-- ------------------------------------------------------------------------
-- 2. VISITS TABLE
-- Tracks each mystery shopper inspection audit conducted twice per period.
-- ------------------------------------------------------------------------
CREATE TABLE visits (
    visit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_code VARCHAR(30) NOT NULL UNIQUE,       -- e.g. 'P9-V2-2026'
    period_year SMALLINT NOT NULL,                -- e.g. 2026
    period_number SMALLINT NOT NULL,              -- Period 1 to 13 (or 1 to 12)
    visit_number_in_period SMALLINT NOT NULL,     -- 1 or 2 (reports arrive twice per period)
    report_date DATE NOT NULL,                    -- Date printed on report summary (e.g. '2026-09-28')
    visit_date DATE NOT NULL,                     -- Pulled directly from Survey Overview (e.g. '2026-09-21')
    company_survey VARCHAR(255) NOT NULL DEFAULT 'Warner Bros Studio Tour London: The Making of Harry Potter 2025',
    overall_score_actual INTEGER,                 -- Overall tour actual points (e.g. 1350)
    overall_score_possible INTEGER,               -- Overall tour possible points (e.g. 1382)
    overall_percentage NUMERIC(5, 2),             -- e.g. 98.00%
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_visit_number CHECK (visit_number_in_period IN (1, 2)),
    CONSTRAINT chk_period_number CHECK (period_number BETWEEN 1 AND 13)
);

CREATE INDEX idx_visits_date ON visits (visit_date);
CREATE INDEX idx_visits_period ON visits (period_year, period_number, visit_number_in_period);

-- ------------------------------------------------------------------------
-- 3. F&B EVALUATIONS TABLE
-- Tracks the specific area (Food Hall, Backlot, Butterbeer) linked to Visit ID,
-- along with total scores, spend, and the shopper's full narrative review.
-- ------------------------------------------------------------------------
CREATE TABLE fb_evaluations (
    evaluation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
    area_id VARCHAR(50) NOT NULL REFERENCES fb_areas(area_id),
    evaluation_time TIME,                         -- e.g. '12:36:00', '15:18:00', '16:09:00'
    actual_score INTEGER NOT NULL,                -- Actual scored points (e.g. 56 or 57)
    possible_score INTEGER NOT NULL,              -- Max points (e.g. 56 or 57)
    score_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
        ROUND((actual_score::numeric / NULLIF(possible_score, 0)::numeric) * 100, 2)
    ) STORED,
    purchase_spend NUMERIC(8, 2),                 -- e.g. £30.00, £21.67
    receipt_img_url TEXT,                         -- Storecheckers receipt verification upload
    items_purchased TEXT,                         -- Items ordered during evaluation
    narrative_review TEXT NOT NULL,               -- Complete verbatim mystery shopper narrative review
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_visit_area UNIQUE (visit_id, area_id),
    CONSTRAINT chk_scores CHECK (actual_score >= 0 AND possible_score > 0 AND actual_score <= possible_score)
);

CREATE INDEX idx_fb_evaluations_visit ON fb_evaluations (visit_id);
CREATE INDEX idx_fb_evaluations_area ON fb_evaluations (area_id);

-- ------------------------------------------------------------------------
-- 4. STAFF INTERACTIONS TABLE
-- Tracks the employee's name or physical description, area worked, and
-- specific service criteria (greeting, allergy check, queue management, upsell),
-- linking directly to their personal service narrative.
-- ------------------------------------------------------------------------
CREATE TABLE staff_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES fb_evaluations(evaluation_id) ON DELETE CASCADE,
    staff_name VARCHAR(150) NOT NULL,             -- e.g. 'Essel', 'Daniella', 'Hannah', or descriptive phrase
    staff_role VARCHAR(100) DEFAULT 'Till / Service Associate',
    interaction_time TIME,                        -- Time of individual service encounter
    wearing_name_badge BOOLEAN NOT NULL DEFAULT true,
    uniform_smartly_presented BOOLEAN NOT NULL DEFAULT true,
    
    -- Specific service criteria extracted from survey answers
    friendly_greeting VARCHAR(50) NOT NULL,       -- 'Exceptional', 'Friendly', 'Minimal', 'Rude', 'None'
    queue_management VARCHAR(50) NOT NULL,        -- 'Full care', 'Good care', 'Meeting expectations', etc.
    active_engagement_till VARCHAR(80) NOT NULL,  -- 'Excellent engagement and interaction', 'Good', etc.
    additional_items_offered VARCHAR(80),         -- 'Great amount of extra info or help', etc.
    
    -- Crucial UK Food Standards & Natasha's Law check
    asked_about_allergies BOOLEAN NOT NULL,       -- TRUE / FALSE (Direct question in report)
    offered_butterbeer BOOLEAN,                   -- Specific to Backlot survey question
    
    body_language VARCHAR(80) NOT NULL,           -- 'Engaging body language and interaction', etc.
    farewell_given BOOLEAN NOT NULL DEFAULT true, -- TRUE / FALSE
    expectations_exceeded VARCHAR(50),            -- 'Amazing', 'Good', 'Average', 'Poor'
    
    -- Narrative linking: Specific excerpt or recognition callout for this staff member
    service_narrative_excerpt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_interactions_eval ON staff_interactions (evaluation_id);
CREATE INDEX idx_staff_interactions_name ON staff_interactions (staff_name);
CREATE INDEX idx_staff_interactions_allergies ON staff_interactions (asked_about_allergies);

-- ========================================================================
-- 5. ANALYTICAL VIEWS FOR DASHBOARDS & REPORTING
-- ========================================================================

-- View: Year-To-Date Score Trends by Catering Area & Visit
CREATE OR REPLACE VIEW view_fb_ytd_scores AS
SELECT 
    v.visit_id,
    v.visit_code,
    v.period_year,
    v.period_number,
    v.visit_number_in_period,
    v.visit_date,
    v.report_date,
    a.area_id,
    a.short_name AS area_name,
    e.actual_score,
    e.possible_score,
    e.score_percentage,
    e.purchase_spend,
    ROUND(AVG(e.score_percentage) OVER (
        PARTITION BY a.area_id, v.period_year 
        ORDER BY v.visit_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ), 2) AS running_ytd_avg_percentage
FROM visits v
JOIN fb_evaluations e ON v.visit_id = e.visit_id
JOIN fb_areas a ON e.area_id = a.area_id
ORDER BY v.visit_date ASC, a.area_id ASC;

-- View: Staff Spotlight (Directly linking employee names to their service narratives)
CREATE OR REPLACE VIEW view_staff_spotlight AS
SELECT 
    si.interaction_id,
    si.staff_name,
    si.staff_role,
    a.short_name AS area_name,
    v.visit_date,
    v.visit_code,
    v.period_number,
    v.period_year,
    si.friendly_greeting,
    si.queue_management,
    si.asked_about_allergies,
    si.additional_items_offered,
    si.expectations_exceeded,
    si.service_narrative_excerpt,
    e.narrative_review AS full_evaluation_narrative,
    e.score_percentage AS area_score_percentage
FROM staff_interactions si
JOIN fb_evaluations e ON si.evaluation_id = e.evaluation_id
JOIN visits v ON e.visit_id = v.visit_id
JOIN fb_areas a ON e.area_id = a.area_id
ORDER BY v.visit_date DESC, si.created_at DESC;

-- View: Allergen & Natasha's Law Compliance Auditor
CREATE OR REPLACE VIEW view_allergy_compliance_audit AS
SELECT 
    a.short_name AS area_name,
    v.period_year,
    COUNT(si.interaction_id) AS total_audited_interactions,
    SUM(CASE WHEN si.asked_about_allergies = TRUE THEN 1 ELSE 0 END) AS allergy_checks_completed,
    ROUND(
        (SUM(CASE WHEN si.asked_about_allergies = TRUE THEN 1 ELSE 0 END)::numeric / 
        NULLIF(COUNT(si.interaction_id), 0)::numeric) * 100, 
        2
    ) AS compliance_rate_percentage
FROM staff_interactions si
JOIN fb_evaluations e ON si.evaluation_id = e.evaluation_id
JOIN visits v ON e.visit_id = v.visit_id
JOIN fb_areas a ON e.area_id = a.area_id
GROUP BY a.short_name, v.period_year;
`;
