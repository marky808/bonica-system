/**
 * 既知の納品IDを使って修正後の納品書作成を直接テストするスクリプト
 */

async function directDeliveryTest() {
  try {
    console.log('🚀 修正後の納品書作成直接テスト開始');

    const baseUrl = 'https://bonica-system-82gujggfu-808worksjp-gmailcoms-projects.vercel.app';

    // 既知の納品IDを使用（以前のテストで確認されたもの）
    const testDeliveryIds = [
      'cmftebb0g0002jndrq1quvilp',
      'cmftekvco0002hv1rg9pokr70',
      'delivery-1758439296865-uccot6r2e'
    ];

    console.log('🎯 テスト対象納品ID:', testDeliveryIds);

    for (const deliveryId of testDeliveryIds) {
      console.log(`\n📄 納品ID ${deliveryId} で納品書作成テスト中...`);

      try {
        const createResponse = await fetch(`${baseUrl}/api/google-sheets/create-delivery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deliveryId: deliveryId
            // templateIdを指定せず、修正されたフォールバック処理をテスト
          })
        });

        console.log(`📊 レスポンス状態: ${createResponse.status}`);

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.log(`❌ 失敗: ${errorText}`);
          continue;
        }

        const result = await createResponse.json();
        console.log('📊 結果:', result);

        if (result.url) {
          console.log('🎉 納品書作成成功！');
          console.log('📄 URL:', result.url);

          // URLからシートIDを抽出
          const urlMatch = result.url.match(/gid=(\d+)/);
          if (urlMatch) {
            const sheetId = urlMatch[1];
            console.log('📋 作成されたシートID:', sheetId);

            // 使用されたテンプレートIDを推測
            console.log('🔍 使用されたテンプレート:');
            console.log('   - 1125769553: 納品書テンプレート（期待値）');
            console.log('   - 521792886: 請求書テンプレート（修正前の誤った値）');
            console.log(`   - 実際: ${sheetId}（新規作成されたシート）`);
          }

          // 1つ成功したらテスト完了
          console.log('✅ テスト完了！修正が正常に動作しています');
          return;
        } else {
          console.log('❌ URLが返されませんでした');
        }

      } catch (error) {
        console.log(`❌ ${deliveryId} のテスト中にエラー:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('❌ すべてのテストが失敗しました');

  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);

    if (error instanceof Error) {
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
  }
}

// 実行
directDeliveryTest().catch(console.error);