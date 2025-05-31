// Manifest 验证脚本
// 用于确保生产版本配置正确

const fs = require('fs');

function validateManifest(manifestPath) {
    console.log(`🔍 验证 ${manifestPath}...`);
    
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // 基础检查
        console.log('✅ JSON格式正确');
        
        // 检查必需字段
        if (!manifest.manifest_version || manifest.manifest_version !== 3) {
            throw new Error('❌ 必须使用 Manifest V3');
        }
        console.log('✅ Manifest V3 格式');
        
        // 检查权限
        if (!manifest.permissions || !manifest.permissions.includes('storage')) {
            throw new Error('❌ 缺少 storage 权限');
        }
        console.log('✅ 包含必要的 storage 权限');
        
        // 检查CSP策略
        if (!manifest.content_security_policy) {
            throw new Error('❌ 缺少 CSP 策略');
        }
        console.log('✅ 包含 CSP 策略');
        
        // 检查Firebase连接权限
        const csp = manifest.content_security_policy.extension_pages;
        if (!csp.includes('firebaseapp.com')) {
            throw new Error('❌ CSP 缺少 Firebase 域名');
        }
        console.log('✅ CSP 包含 Firebase 域名');
        
        // 生产版本不应包含的配置
        if (manifest.oauth2) {
            console.log('⚠️ 包含 oauth2 配置（开发版本特有）');
        }
        
        if (manifest.permissions.includes('identity')) {
            console.log('⚠️ 包含 identity 权限（当前版本不需要）');
        }
        
        console.log(`✅ ${manifestPath} 验证通过！\n`);
        return true;
        
    } catch (error) {
        console.error(`❌ ${manifestPath} 验证失败: ${error.message}\n`);
        return false;
    }
}

// 验证两个文件
console.log('🚀 开始验证 Manifest 文件...\n');

const productionValid = validateManifest('manifest.json');
const devValid = validateManifest('manifest.dev.json');

if (productionValid) {
    console.log('🎉 生产版本配置正确，新用户可以正常使用所有功能！');
} else {
    console.log('💥 生产版本配置有问题，需要修复！');
}

if (devValid) {
    console.log('🔧 开发版本配置正确。');
} else {
    console.log('⚠️ 开发版本配置需要注意。');
} 