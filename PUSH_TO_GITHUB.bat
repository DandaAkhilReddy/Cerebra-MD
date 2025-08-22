@echo off
echo ========================================
echo  CEREBRA-MD GitHub Push Script
echo  HHA Medicine Analytics Platform
echo ========================================
echo.

echo 📁 Current directory: %CD%
echo.

echo 🔍 Checking git status...
git status
echo.

echo 📝 Adding all files to git...
git add .
echo.

echo 📊 Checking what will be committed...
git status --short
echo.

echo 💬 Creating commit...
git commit -m "feat: Complete Cerebra-MD healthcare analytics platform

🏥 Healthcare Analytics Platform for HHA Medicine
- Complete React/Next.js dashboard with KPI cards & charts
- FastAPI backend with health endpoints and mock KPI data  
- Azure infrastructure as code (Bicep templates)
- GitHub Actions CI/CD pipeline
- Comprehensive documentation (KPI catalog, architecture)
- Ready for AdvancedMD integration and Databricks deployment

📊 KPIs Implemented:
- Encounter → Claim Funnel (FPY, Denial Rate, Submission Rate)
- Denial Analytics (by reason, payer, doctor, facility)
- Cash Realization & TAT (payment speed, collection rates)  
- Operational Throughput (encounters/day, productivity)

🔧 Tech Stack:
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: FastAPI, Python 3.11, Pydantic
- Infrastructure: Azure (App Service, Key Vault, Storage)
- Data: Ready for Databricks integration
- DevOps: GitHub Actions, Docker

🔒 Enterprise Features:
- HIPAA-compliant architecture design
- Role-based access control (doctors see only their data)
- PHI masking and data security controls
- Comprehensive monitoring and logging

🚀 Ready for Sprint 1 development and Azure deployment

Co-authored-by: Claude <noreply@anthropic.com>"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Commit failed! Please check the error above.
    pause
    exit /b 1
)

echo.
echo ✅ Commit created successfully!
echo.

echo 🚀 Pushing to GitHub...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Push failed! Please check the error above.
    echo.
    echo 💡 Common solutions:
    echo    - Make sure you're in the correct directory
    echo    - Check your GitHub authentication
    echo    - Verify the remote origin is set correctly
    echo.
    pause
    exit /b 1
)

echo.
echo 🎉 SUCCESS! Cerebra-MD has been pushed to GitHub!
echo.
echo 📋 Next Steps:
echo    1. Visit: https://github.com/DandaAkhilReddy/Cerebra-MD
echo    2. Review the uploaded files and documentation
echo    3. Set up GitHub repository settings (branch protection, secrets)
echo    4. Configure Azure resources using the Bicep templates
echo    5. Set up Databricks workspace and data pipeline
echo    6. Deploy the application using GitHub Actions
echo.
echo 📊 Your complete healthcare analytics platform is now ready!
echo.
pause