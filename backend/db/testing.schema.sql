-- ============================================================
// KAYAD ENTERPRISE QUALITY ENGINEERING PLATFORM - DATABASE SCHEMA
// Quality assurance framework for every release
-- ============================================================

-- ============================================================
// TEST SUITES
-- ============================================================
CREATE TABLE IF NOT EXISTS test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Suite
  suite_code VARCHAR(50) UNIQUE NOT NULL,
  suite_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Module
  module VARCHAR(50) NOT NULL, -- 'marketplace', 'dealer', 'auction', 'inspection', 'finance', 'identity', etc.

  -- Type
  test_type VARCHAR(30) NOT NULL, -- 'unit', 'integration', 'e2e', 'api', 'performance', 'security', 'accessibility'

  -- Coverage
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  skipped_tests INTEGER DEFAULT 0,
  coverage_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Execution
  last_run_at TIMESTAMP,
  last_run_duration_ms INTEGER,
  last_run_status VARCHAR(20), -- 'passed', 'failed', 'running', 'pending'

  -- Status
  is_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suite_module ON test_suites(module);
CREATE INDEX idx_suite_type ON test_suites(test_type);
CREATE INDEX idx_suite_status ON test_suites(last_run_status);

-- ============================================================
// TEST CASES
-- ============================================================
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Test
  test_code VARCHAR(50) UNIQUE NOT NULL,
  test_name VARCHAR(300) NOT NULL,
  description TEXT,

  -- Suite
  suite_id UUID REFERENCES test_suites(id),

  -- Category
  category VARCHAR(50) NOT NULL, -- 'functional', 'regression', 'smoke', 'sanity'

  -- Priority
  priority VARCHAR(10) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'disabled', 'deprecated'

  -- Execution
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20), -- 'passed', 'failed', 'skipped', 'blocked'
  last_run_duration_ms INTEGER,
  last_error TEXT,

  -- Steps
  test_steps JSONB DEFAULT '[]',

  -- Expected Results
  expected_results TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_suite ON test_cases(suite_id);
CREATE INDEX idx_test_status ON test_cases(last_run_status);
CREATE INDEX idx_test_priority ON test_cases(priority);

-- ============================================================
// TEST EXECUTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Execution
  execution_code VARCHAR(50) UNIQUE NOT NULL,

  -- Build/Release
  build_number VARCHAR(50),
  release_version VARCHAR(20),
  environment VARCHAR(20) NOT NULL, -- 'development', 'testing', 'staging', 'production'

  -- Suite/Test
  suite_id UUID REFERENCES test_suites(id),
  test_id UUID REFERENCES test_cases(id),

  -- Results
  status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'skipped', 'blocked', 'running'

  -- Timing
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Details
  error_message TEXT,
  stack_trace TEXT,
  screenshots JSONB DEFAULT '[]',
  logs TEXT,

  -- Environment Details
  browser VARCHAR(50),
  device VARCHAR(50),
  os VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_execution_status ON test_executions(status);
CREATE INDEX idx_execution_suite ON test_executions(suite_id);
CREATE INDEX idx_execution_date ON test_executions(started_at DESC);

-- ============================================================
// QUALITY GATES
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gate
  gate_code VARCHAR(50) UNIQUE NOT NULL,
  gate_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Type
  gate_type VARCHAR(30) NOT NULL, -- 'code_review', 'static_analysis', 'unit_test', 'integration_test', 'api_test', 'e2e_test', 'security_scan', 'performance_test', 'uat', 'release_approval'

  -- Criteria
  pass_threshold DECIMAL(5, 2) DEFAULT 100, -- Percentage required to pass
  critical_failures_allowed INTEGER DEFAULT 0,

  -- Order
  execution_order INTEGER NOT NULL,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gate_type ON quality_gates(gate_type);
CREATE INDEX idx_gate_order ON quality_gates(execution_order);

-- ============================================================
// QUALITY GATE RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_gate_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Release
  release_id UUID,
  release_version VARCHAR(20),

  -- Gate
  gate_id UUID REFERENCES quality_gates(id),
  gate_code VARCHAR(50) NOT NULL,
  gate_name VARCHAR(200) NOT NULL,

  -- Result
  status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'skipped', 'running'
  score DECIMAL(5, 2) DEFAULT 0,
  pass_threshold DECIMAL(5, 2) DEFAULT 100,

  -- Details
  metrics JSONB DEFAULT '{}',
  failures JSONB DEFAULT '[]',

  -- Timing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Approvals
  approved_by UUID,
  approved_by_name VARCHAR(100),
  approved_at TIMESTAMP,
  approval_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gate_result_release ON quality_gate_results(release_id);
CREATE INDEX idx_gate_result_status ON quality_gate_results(status);

-- ============================================================
// RELEASES
-- ============================================================
CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Release
  release_code VARCHAR(50) UNIQUE NOT NULL,
  release_version VARCHAR(20) NOT NULL,
  release_name VARCHAR(100),
  description TEXT,

  -- Environment
  environment VARCHAR(20) DEFAULT 'staging', -- 'development', 'testing', 'staging', 'production'

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'testing', 'passed', 'failed', 'deployed', 'rolled_back'

  -- Quality Gates
  gates_passed INTEGER DEFAULT 0,
  gates_failed INTEGER DEFAULT 0,
  gates_total INTEGER DEFAULT 0,

  -- Test Results
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  coverage_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Deployment
  deployed_at TIMESTAMP,
  deployed_by UUID,
  deployed_by_name VARCHAR(100),

  -- Rollback
  rolled_back_at TIMESTAMP,
  rollback_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_release_status ON releases(status);
CREATE INDEX idx_release_version ON releases(release_version);

-- ============================================================
// DEFECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Defect
  defect_code VARCHAR(50) UNIQUE NOT NULL, -- KAYAD-DEF-XXXXXXXX

  -- Details
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,

  -- Classification
  severity VARCHAR(10) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  priority VARCHAR(10) NOT NULL, -- 'critical', 'high', 'medium', 'low'

  -- Module
  affected_module VARCHAR(50) NOT NULL,
  affected_component VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'verified', 'closed', 'deferred'

  -- Assignment
  assigned_to UUID,
  assigned_to_name VARCHAR(100),
  reporter VARCHAR(100),

  -- Root Cause
  root_cause TEXT,

  -- Test Case
  test_case_id UUID REFERENCES test_cases(id),
  test_execution_id UUID REFERENCES test_executions(id),

  -- Release
  found_in_release VARCHAR(20),
  fixed_in_release VARCHAR(20),

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_defect_status ON defects(status);
CREATE INDEX idx_defect_severity ON defects(severity);
CREATE INDEX idx_defect_module ON defects(affected_module);

-- ============================================================
// TEST COVERAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS test_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Module
  module VARCHAR(50) NOT NULL,
  module_name VARCHAR(100) NOT NULL,

  -- Coverage Type
  coverage_type VARCHAR(30) NOT NULL, -- 'code', 'functional', 'integration', 'e2e'

  -- Metrics
  total_lines INTEGER DEFAULT 0,
  covered_lines INTEGER DEFAULT 0,
  coverage_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Branch Coverage
  total_branches INTEGER DEFAULT 0,
  covered_branches INTEGER DEFAULT 0,
  branch_coverage DECIMAL(5, 2) DEFAULT 0,

  -- Function Coverage
  total_functions INTEGER DEFAULT 0,
  covered_functions INTEGER DEFAULT 0,
  function_coverage DECIMAL(5, 2) DEFAULT 0,

  -- Test Count
  test_cases INTEGER DEFAULT 0,

  -- Period
  period_date DATE NOT NULL,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(module, coverage_type, period_date)
);

-- ============================================================
// SECURITY SCANS
-- ============================================================
CREATE TABLE IF NOT EXISTS security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scan
  scan_code VARCHAR(50) UNIQUE NOT NULL,

  -- Type
  scan_type VARCHAR(30) NOT NULL, -- 'dependency', 'static', 'dynamic', 'penetration'

  -- Results
  status VARCHAR(20) NOT NULL, -- 'running', 'passed', 'failed', 'warnings'

  -- Findings
  total_findings INTEGER DEFAULT 0,
  critical_findings INTEGER DEFAULT 0,
  high_findings INTEGER DEFAULT 0,
  medium_findings INTEGER DEFAULT 0,
  low_findings INTEGER DEFAULT 0,

  -- Details
  findings JSONB DEFAULT '[]',

  -- Release
  release_id UUID,
  release_version VARCHAR(20),

  -- Timing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
// PERFORMANCE BENCHMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS performance_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Benchmark
  benchmark_code VARCHAR(50) UNIQUE NOT NULL,

  -- Type
  benchmark_type VARCHAR(30) NOT NULL, -- 'load', 'stress', 'spike', 'soak'

  -- Endpoint/Action
  endpoint VARCHAR(200),
  action_name VARCHAR(100),

  -- Results
  status VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'running'

  -- Metrics
  concurrent_users INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,

  -- Timing
  avg_response_time_ms INTEGER DEFAULT 0,
  p50_response_time_ms INTEGER DEFAULT 0,
  p95_response_time_ms INTEGER DEFAULT 0,
  p99_response_time_ms INTEGER DEFAULT 0,
  min_response_time_ms INTEGER DEFAULT 0,
  max_response_time_ms INTEGER DEFAULT 0,
  throughput_rps DECIMAL(10, 2) DEFAULT 0,

  -- Thresholds
  target_latency_ms INTEGER,
  target_throughput_rps DECIMAL(10, 2),

  -- Release
  release_version VARCHAR(20),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_benchmark_type ON performance_benchmarks(benchmark_type);
CREATE INDEX idx_benchmark_status ON performance_benchmarks(status);

-- ============================================================
// RELEASE APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS release_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Release
  release_id UUID REFERENCES releases(id),
  release_version VARCHAR(20) NOT NULL,

  -- Approval
  approval_type VARCHAR(50) NOT NULL, -- 'qa', 'security', 'product', 'operations', 'executive'

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated'

  -- Approver
  approver_id UUID,
  approver_name VARCHAR(100) NOT NULL,
  approver_email VARCHAR(200),
  approver_role VARCHAR(50),

  -- Decision
  decision VARCHAR(20),
  decision_notes TEXT,
  decided_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approval_release ON release_approvals(release_id);
CREATE INDEX idx_approval_status ON release_approvals(status);
