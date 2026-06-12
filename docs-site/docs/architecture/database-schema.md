# Skema Database (Database Schema)

Sistem ERP PM & QA menggunakan database SQLite lokal (`erp_pm.db`) yang dimodelkan melalui **Drizzle ORM**.

---

## 📊 Diagram Entitas Hubungan (ERD)

Di bawah ini adalah diagram hubungan antar tabel yang dirender secara otomatis menggunakan Mermaid.js:

```mermaid
erDiagram
    users ||--o{ tasks : assigned_to
    users ||--o{ test_cases : executed_by
    projects ||--o{ tasks : contains
    projects ||--o{ test_plans : has
    projects ||--o{ milestones : tracks
    test_plans ||--o{ test_cases : includes
    
    users {
        string id PK
        string name
        string email UK
        string passwordHash
        string role "admin | pm | developer | qa"
        timestamp createdAt
    }
    
    projects {
        string id PK
        string name
        string description
        string startDate
        string endDate
        string status "planned | active | on_hold | completed"
        json sCurveTarget
        json sCurveActual
        timestamp createdAt
    }
    
    tasks {
        string id PK
        string projectId FK
        string assigneeId FK
        string title
        string description
        string status "todo | in_progress | review | done"
        string priority "low | medium | high | urgent"
        string dueDate
        string taskCode
        string epic
        string feature
        string taskType
        string srdRef
        string frCode
        string acceptanceCriteria
        integer progress
        string blocker
        string sprintTarget
        string phase
        string screenshotUrl
        integer isArchived
        string erpRole "administrator | top_user | user | all_roles"
        json roleSpecificFeatures
        timestamp updatedAt
    }
    
    test_plans {
        string id PK
        string projectId FK
        string name
        string module "Pemasok | Pelanggan | Barang | Katalog Lain | Pengaturan | Keuangan | Kinerja"
        string status "draft | active | completed"
        timestamp createdAt
    }
    
    test_cases {
        string id PK
        string testPlanId FK
        string executedBy FK
        string caseNumber
        string description
        string steps
        string expectedResult
        string actualResult
        string status "pending | pass | fail | blocked"
        string notes
        string executedAt
        string erpRole "administrator | top_user | user | matrix"
        string testType "functional | permission | workflow | matrix"
        json loginCredentials
    }
    
    milestones {
        string id PK
        string projectId FK
        string phase
        string module
        string name
        string startDate
        string endDate
        string plannedWeight
        string dependency
        string exitCriteria
        string status
        timestamp createdAt
    }
```

---

## 🗄️ Lokasi Kode Skema
Seluruh skema di atas didefinisikan dalam kode TypeScript menggunakan library Drizzle ORM pada berkas:
📂 `src/db/schema.ts`
