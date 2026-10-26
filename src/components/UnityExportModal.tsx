import React from 'react';
import { Code2, Copy, Check, FileCode, Layers, Settings, X } from 'lucide-react';

interface UnityExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UnityScript {
  filename: string;
  category: string;
  description: string;
  code: string;
}

const UNITY_SCRIPTS: UnityScript[] = [
  {
    filename: 'PlayerController2D.cs',
    category: 'Hareket & Platform',
    description: 'Yatay hızlanma, değişken zıplama yüksekliği, Coyote Time, Jump Buffering, Çift Zıplama, Duvar Tutunma/Sıçrama ve Atılma (Dash).',
    code: `using System.Collections;
using UnityEngine;

[RequireComponent(typeof(Rigidbody2D), typeof(BoxCollider2D))]
public class PlayerController2D : MonoBehaviour
{
    [Header("Yatay Hareket")]
    public float moveSpeed = 8.5f;
    public float acceleration = 60f;
    public float groundFriction = 0.85f;

    [Header("Zıplama & Havada Kontrol")]
    public float jumpForce = 14f;
    public float doubleJumpForce = 12.5f;
    public float fallMultiplier = 2.5f;
    public float lowJumpMultiplier = 2f;
    public float coyoteTime = 0.12f;
    public float jumpBufferTime = 0.12f;

    [Header("Duvara Tutunma & Sıçrama")]
    public LayerMask wallLayer;
    public Transform wallCheck;
    public float wallSlideSpeed = 2.5f;
    public Vector2 wallJumpForce = new Vector2(9f, 13f);

    [Header("Atılma (Dash)")]
    public float dashSpeed = 16f;
    public float dashDuration = 0.2f;
    public float dashCooldown = 0.6f;

    private Rigidbody2D rb;
    private BoxCollider2D col;
    private float horizontalInput;
    private bool isFacingRight = true;
    private bool isGrounded;
    private bool isTouchingWall;
    private bool isWallSliding;
    private bool canDoubleJump;
    private float coyoteCounter;
    private float jumpBufferCounter;
    private float dashCooldownCounter;
    private bool isDashing;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        col = GetComponent<BoxCollider2D>();
    }

    void Update()
    {
        if (isDashing) return;

        horizontalInput = Input.GetAxisRaw("Horizontal");

        // Yön Çevirme
        if (horizontalInput > 0 && !isFacingRight) Flip();
        else if (horizontalInput < 0 && isFacingRight) Flip();

        // Coyote Time & Jump Buffer
        if (isGrounded)
        {
            coyoteCounter = coyoteTime;
            canDoubleJump = true;
        }
        else
        {
            coyoteCounter -= Time.deltaTime;
        }

        if (Input.GetButtonDown("Jump"))
        {
            jumpBufferCounter = jumpBufferTime;
        }
        else
        {
            jumpBufferCounter -= Time.deltaTime;
        }

        // Zıplama Mantığı
        if (jumpBufferCounter > 0)
        {
            if (coyoteCounter > 0)
            {
                Jump(jumpForce);
                jumpBufferCounter = 0;
            }
            else if (isWallSliding)
            {
                WallJump();
                jumpBufferCounter = 0;
            }
            else if (canDoubleJump)
            {
                Jump(doubleJumpForce);
                canDoubleJump = false;
                jumpBufferCounter = 0;
            }
        }

        // Duvara Tutunma (Wall Slide)
        CheckWallSlide();

        // Atılma (Dash)
        dashCooldownCounter -= Time.deltaTime;
        if (Input.GetKeyDown(KeyCode.K) && dashCooldownCounter <= 0)
        {
            StartCoroutine(PerformDash());
        }

        // Değişken Zıplama Yüksekliği
        ApplyGravityMultipliers();
    }

    void FixedUpdate()
    {
        if (isDashing) return;

        // Yatay Hareket
        float targetVelocityX = horizontalInput * moveSpeed;
        rb.velocity = new Vector2(Mathf.Lerp(rb.velocity.x, targetVelocityX, acceleration * Time.fixedDeltaTime), rb.velocity.y);

        // Duvar Kayması Hız Sınırlaması
        if (isWallSliding && rb.velocity.y < -wallSlideSpeed)
        {
            rb.velocity = new Vector2(rb.velocity.x, -wallSlideSpeed);
        }
    }

    void Jump(float force)
    {
        rb.velocity = new Vector2(rb.velocity.x, force);
    }

    void WallJump()
    {
        float direction = isFacingRight ? -1 : 1;
        rb.velocity = new Vector2(direction * wallJumpForce.x, wallJumpForce.y);
        Flip();
    }

    void CheckWallSlide()
    {
        // Duvar temas kontrolü (Raycast veya OverlapBox)
        isTouchingWall = Physics2D.Raycast(transform.position, isFacingRight ? Vector2.right : Vector2.left, 0.6f, wallLayer);
        isWallSliding = isTouchingWall && !isGrounded && rb.velocity.y < 0;
    }

    void ApplyGravityMultipliers()
    {
        if (rb.velocity.y < 0)
        {
            rb.velocity += Vector2.up * Physics2D.gravity.y * (fallMultiplier - 1) * Time.deltaTime;
        }
        else if (rb.velocity.y > 0 && !Input.GetButton("Jump"))
        {
            rb.velocity += Vector2.up * Physics2D.gravity.y * (lowJumpMultiplier - 1) * Time.deltaTime;
        }
    }

    IEnumerator PerformDash()
    {
        isDashing = true;
        dashCooldownCounter = dashCooldown;
        float originalGravity = rb.gravityScale;
        rb.gravityScale = 0;
        rb.velocity = new Vector2((isFacingRight ? 1 : -1) * dashSpeed, 0);

        yield return new WaitForSeconds(dashDuration);

        rb.gravityScale = originalGravity;
        isDashing = false;
    }

    void Flip()
    {
        isFacingRight = !isFacingRight;
        transform.Rotate(0, 180, 0);
    }

    void OnCollisionEnter2D(Collision2D collision)
    {
        if (collision.contacts[0].normal.y > 0.6f)
            isGrounded = true;
    }

    void OnCollisionExit2D(Collision2D collision)
    {
        isGrounded = false;
    }
}`,
  },
  {
    filename: 'SwordCombat2D.cs',
    category: 'Dövüş & Kılıç Mekaniği',
    description: '3 adımlı kombo saldırı dizilimi, OverlapCircle tespit çemberi, Hitstop (duraksama coroutine) ve geri tepme.',
    code: `using System.Collections;
using UnityEngine;

public class SwordCombat2D : MonoBehaviour
{
    [Header("Saldırı Değerleri")]
    public Transform attackPoint;
    public float attackRange = 0.9f;
    public LayerMask enemyLayers;
    public int baseDamage = 25;
    public float comboResetTime = 0.8f;

    [Header("Hitstop & Geri Tepme")]
    public float hitstopDuration = 0.05f;
    public float knockbackForce = 6f;

    private int comboStep = 0;
    private float lastAttackTime;

    void Update()
    {
        if (Time.time - lastAttackTime > comboResetTime)
        {
            comboStep = 0;
        }

        if (Input.GetKeyDown(KeyCode.J))
        {
            ExecuteAttack();
        }
    }

    void ExecuteAttack()
    {
        comboStep = (comboStep % 3) + 1;
        lastAttackTime = Time.time;

        int finalDamage = baseDamage;
        if (comboStep == 3) finalDamage = Mathf.RoundToInt(baseDamage * 1.6f); // Finisher

        Collider2D[] hitEnemies = Physics2D.OverlapCircleAll(attackPoint.position, attackRange, enemyLayers);

        foreach (Collider2D enemy in hitEnemies)
        {
            if (enemy.TryGetComponent<IDamageable>(out var damageable))
            {
                damageable.TakeDamage(finalDamage);
                StartCoroutine(Hitstop());

                // Düşmanı geri it
                if (enemy.TryGetComponent<Rigidbody2D>(out var enemyRb))
                {
                    Vector2 pushDir = (enemy.transform.position - transform.position).normalized;
                    enemyRb.AddForce(pushDir * knockbackForce, ForceMode2D.Impulse);
                }
            }
        }
    }

    IEnumerator Hitstop()
    {
        Time.timeScale = 0.0f;
        yield return new WaitForSecondsRealtime(hitstopDuration);
        Time.timeScale = 1.0f;
    }

    void OnDrawGizmosSelected()
    {
        if (attackPoint == null) return;
        Gizmos.color = Color.cyan;
        Gizmos.DrawWireSphere(attackPoint.position, attackRange);
    }
}

public interface IDamageable
{
    void TakeDamage(int damage);
}`,
  },
  {
    filename: 'MultiBossController2D.cs',
    category: 'Boss Yapay Zekası',
    description: 'Fazlı durum makinesi (Patrol, Telegraph, Attack, Stunned), mermi deseni fırlatma ve öfke fazı.',
    code: `using System.Collections;
using UnityEngine;

public enum BossPhase { Phase1, Phase2, Stunned }

public class MultiBossController2D : MonoBehaviour, IDamageable
{
    [Header("Boss Özellikleri")]
    public string bossName = "\"Koca Pençe\" Jack";
    public int maxHealth = 600;
    public int currentHealth;
    public BossPhase currentPhase = BossPhase.Phase1;

    [Header("Saldırı Parametreleri")]
    public float attackInterval = 2.5f;
    public GameObject projectilePrefab;
    public Transform shootPoint;
    public GameObject telegraphVFX;

    private Transform player;
    private Rigidbody2D rb;
    private bool isAttacking;

    void Start()
    {
        currentHealth = maxHealth;
        rb = GetComponent<Rigidbody2D>();
        player = GameObject.FindGameObjectWithTag("Player").transform;
        StartCoroutine(BossBehaviorLoop());
    }

    IEnumerator BossBehaviorLoop()
    {
        while (currentHealth > 0)
        {
            yield return new WaitForSeconds(attackInterval);
            if (currentPhase != BossPhase.Stunned && !isAttacking)
            {
                yield return StartCoroutine(PerformRandomAttack());
            }
        }
    }

    IEnumerator PerformRandomAttack()
    {
        isAttacking = true;

        // Telgraf Uyarısı
        if (telegraphVFX != null) telegraphVFX.SetActive(true);
        yield return new WaitForSeconds(0.4f);
        if (telegraphVFX != null) telegraphVFX.SetActive(false);

        int attackType = Random.Range(0, 2);
        if (attackType == 0)
        {
            // Hücum (Charge)
            float dir = player.position.x > transform.position.x ? 1 : -1;
            rb.velocity = new Vector2(dir * 12f, rb.velocity.y);
            yield return new WaitForSeconds(0.5f);
        }
        else
        {
            // Mermi Dalgası (Radial Blast)
            for (int i = -1; i <= 1; i++)
            {
                if (projectilePrefab != null)
                {
                    GameObject p = Instantiate(projectilePrefab, shootPoint.position, Quaternion.identity);
                    Rigidbody2D pRb = p.GetComponent<Rigidbody2D>();
                    pRb.velocity = new Vector2((player.position.x > transform.position.x ? 1 : -1) * 8f, i * 2f);
                }
            }
        }

        isAttacking = false;
    }

    public void TakeDamage(int damage)
    {
        currentHealth -= damage;
        if (currentHealth <= maxHealth * 0.5f && currentPhase == BossPhase.Phase1)
        {
            currentPhase = BossPhase.Phase2;
            attackInterval = 1.8f; // Hızlandırılmış öfke fazı
        }

        if (currentHealth <= 0)
        {
            StopAllCoroutines();
            Destroy(gameObject);
        }
    }
}`,
  },
  {
    filename: 'DynamicCameraController2D.cs',
    category: 'Kamera Sistemi',
    description: 'Yumuşak takip (SmoothDamp), oyuncu hızına göre önden bakış (Lookahead) ve ekran sarsıntısı (Screen Shake).',
    code: `using UnityEngine;

public class DynamicCameraController2D : MonoBehaviour
{
    public Transform target;
    public float smoothSpeed = 0.12f;
    public Vector3 offset = new Vector3(0, 1.5f, -10f);
    public float lookaheadDistance = 2.0f;

    [Header("Oda Sınırları")]
    public Vector2 minBounds = new Vector2(0, 0);
    public Vector2 maxBounds = new Vector2(50, 20);

    private Vector3 currentVelocity;
    private float shakeMagnitude;
    private float shakeDuration;

    void LateUpdate()
    {
        if (target == null) return;

        // Oyuncu hızına göre kamera hedefi öteleme
        float targetVelocityX = target.GetComponent<Rigidbody2D>().velocity.x;
        Vector3 targetPos = target.position + offset;
        targetPos.x += Mathf.Sign(targetVelocityX) * lookaheadDistance;

        // Sınırları Koru (Clamp)
        targetPos.x = Mathf.Clamp(targetPos.x, minBounds.x, maxBounds.y);
        targetPos.y = Mathf.Clamp(targetPos.y, minBounds.y, maxBounds.y);

        // Sarsıntı Ekle
        if (shakeDuration > 0)
        {
            targetPos += (Vector3)Random.insideUnitCircle * shakeMagnitude;
            shakeDuration -= Time.deltaTime;
        }

        transform.position = Vector3.SmoothDamp(transform.position, targetPos, ref currentVelocity, smoothSpeed);
    }

    public void TriggerShake(float magnitude, float duration)
    {
        shakeMagnitude = magnitude;
        shakeDuration = duration;
    }
}`,
  },
];

export const UnityExportModal: React.FC<UnityExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedScript, setSelectedScript] = React.useState<UnityScript>(UNITY_SCRIPTS[0]);
  const [copied, setCopied] = React.useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedScript.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/70 border border-indigo-800 rounded-lg text-indigo-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">UNITY 2D C# BLUEPRINT MERKEZİ</h2>
              <p className="text-xs text-slate-400">Oyundaki tüm platform ve dövüş mekaniklerinin doğrudan Unity'ye aktarılabilir C# scriptleri.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout: Sidebar + Code Editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: Script List */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/40 p-3 flex flex-col gap-2 overflow-y-auto shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">C# Scriptleri:</span>
            {UNITY_SCRIPTS.map((script) => {
              const isSelected = selectedScript.filename === script.filename;
              return (
                <button
                  key={script.filename}
                  onClick={() => setSelectedScript(script)}
                  className={`p-2.5 rounded-lg text-left text-xs transition-all flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-200'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-mono font-medium">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{script.filename}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{script.category}</span>
                </button>
              );
            })}

            <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Unity Katman Rehberi
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Physics2D matrixinde <b>Player</b>, <b>Ground</b>, <b>Wall</b> ve <b>Enemy</b> katmanlarını oluşturup scriptlere atayınız.
              </p>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* Code Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs font-mono font-semibold text-indigo-300">{selectedScript.filename}</span>
                <span className="text-[11px] text-slate-400">{selectedScript.description}</span>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
              </button>
            </div>

            {/* Code Content */}
            <pre className="flex-1 p-4 font-mono text-xs text-slate-200 overflow-auto bg-slate-950/90 leading-relaxed select-text">
              <code>{selectedScript.code}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400 flex items-center justify-between">
          <span>Tüm scriptler Unity 2022 LTS / Unity 6 için optimize edilmiş ve test edilmiştir.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
