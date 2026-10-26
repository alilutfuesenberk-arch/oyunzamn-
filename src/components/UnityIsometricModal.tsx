import React from 'react';
import { Code2, Copy, Check, FileCode, Layers, X } from 'lucide-react';

interface UnityIsometricModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UnityScript {
  filename: string;
  category: string;
  description: string;
  code: string;
}

const ISOMETRIC_UNITY_SCRIPTS: UnityScript[] = [
  {
    filename: 'IsometricPlayerController.cs',
    category: 'İzometrik Hareket & Nişan',
    description: 'İzometrik eksen dönüşümlü WASD hareketi, 360° fareye yönelme (mouse look) ve takla (dodge roll).',
    code: `using System.Collections;
using UnityEngine;

[RequireComponent(typeof(Rigidbody2D))]
public class IsometricPlayerController : MonoBehaviour
{
    [Header("Hareket Ayarları")]
    public float moveSpeed = 6.5f;
    public float rollSpeed = 14f;
    public float rollDuration = 0.25f;

    private Rigidbody2D rb;
    private Vector2 moveInput;
    private Vector2 mousePos;
    private Camera cam;
    private bool isRolling;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        cam = Camera.main;
    }

    void Update()
    {
        if (isRolling) return;

        // WASD Girdileri
        float h = Input.GetAxisRaw("Horizontal");
        float v = Input.GetAxisRaw("Vertical");

        // İzometrik 2.5D Projeksiyon Dönüşümü
        // (x - y) ve (x + y) * 0.5f
        Vector2 isoDirection = new Vector2(h - v, (h + v) * 0.5f).normalized;
        moveInput = isoDirection;

        // 360° Fareye Doğru Dönme
        mousePos = cam.ScreenToWorldPoint(Input.mousePosition);
        Vector2 lookDir = mousePos - rb.position;
        float angle = Mathf.Atan2(lookDir.y, lookDir.x) * Mathf.Rad2Deg;
        rb.rotation = angle;

        // Space: Dodge Roll (Takla)
        if (Input.GetKeyDown(KeyCode.Space))
        {
            StartCoroutine(PerformRoll());
        }
    }

    void FixedUpdate()
    {
        if (isRolling) return;
        rb.velocity = moveInput * moveSpeed;
    }

    IEnumerator PerformRoll()
    {
        isRolling = true;
        Vector2 rollDir = moveInput != Vector2.zero ? moveInput : (Vector2)transform.right;
        rb.velocity = rollDir * rollSpeed;

        yield return new WaitForSeconds(rollDuration);

        isRolling = false;
    }
}`,
  },
  {
    filename: 'IsometricCombatSystem.cs',
    category: 'Hotline Miami Dövüş & Silahlar',
    description: 'Ateşli silahlar, katana savurma, silah fırlatma (throw) ve yerdeki düşmanı infaz etme (execution).',
    code: `using System.Collections;
using UnityEngine;

public class IsometricCombatSystem : MonoBehaviour
{
    [Header("Silah Bilgisi")]
    public bool isRanged = true;
    public int currentAmmo = 6;
    public float attackRate = 0.2f;
    public GameObject bulletPrefab;
    public Transform firePoint;
    public GameObject thrownWeaponPrefab;

    [Header("Yakın Dövüş")]
    public float meleeRange = 1.2f;
    public LayerMask enemyLayer;

    private float nextAttackTime;

    void Update()
    {
        // Sol Tık: Ateş Et veya Kılıç Savur
        if (Input.GetMouseButton(0) && Time.time >= nextAttackTime)
        {
            if (isRanged)
            {
                if (currentAmmo > 0) Shoot();
            }
            else
            {
                MeleeSlash();
            }
        }

        // Sağ Tık: Silahı Fırlat (Throw Weapon)
        if (Input.GetMouseButtonDown(1))
        {
            ThrowWeapon();
        }

        // Space: Yerdeki Düşmanı İnfaz Et
        if (Input.GetKeyDown(KeyCode.Space))
        {
            CheckGroundExecution();
        }
    }

    void Shoot()
    {
        nextAttackTime = Time.time + attackRate;
        currentAmmo--;

        Instantiate(bulletPrefab, firePoint.position, firePoint.rotation);
        // Silah sesi & Kamera sarsıntısı tetikle
        IsometricCameraController.Instance.TriggerShake(0.15f, 0.1f);
    }

    void MeleeSlash()
    {
        nextAttackTime = Time.time + attackRate;
        Collider2D[] hitEnemies = Physics2D.OverlapCircleAll(firePoint.position, meleeRange, enemyLayer);

        foreach (var enemy in hitEnemies)
        {
            if (enemy.TryGetComponent<IsometricEnemyAI>(out var ai))
            {
                ai.TakeLethalHit(transform.position);
            }
        }
    }

    void ThrowWeapon()
    {
        GameObject thrown = Instantiate(thrownWeaponPrefab, firePoint.position, firePoint.rotation);
        Rigidbody2D rb = thrown.GetComponent<Rigidbody2D>();
        rb.velocity = transform.right * 18f;

        // Silahsız duruma geç (Yumruklar)
        isRanged = false;
        currentAmmo = 0;
    }

    void CheckGroundExecution()
    {
        Collider2D[] nearby = Physics2D.OverlapCircleAll(transform.position, 1.0f, enemyLayer);
        foreach (var c in nearby)
        {
            if (c.TryGetComponent<IsometricEnemyAI>(out var ai) && ai.isKnockedDown)
            {
                ai.ExecuteOnGround();
                IsometricCameraController.Instance.TriggerShake(0.35f, 0.2f);
                break;
            }
        }
    }
}`,
  },
  {
    filename: 'DoorBreach2D.cs',
    category: 'Kapı Tekmeleme Fiziği',
    description: 'HingeJoint2D kapı tekmeleme, hızlı dönme ve arkasındaki düşmanı yere serip sersemletme.',
    code: `using UnityEngine;

public class DoorBreach2D : MonoBehaviour
{
    public float breachTorque = 450f;
    public LayerMask enemyLayer;
    private Rigidbody2D rb;
    private bool hasBreached = false;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    void OnCollisionEnter2D(Collision2D collision)
    {
        // Oyuncu kapıya koştuğunda kapıyı tekmele
        if (collision.gameObject.CompareTag("Player") && !hasBreached)
        {
            hasBreached = true;
            Vector2 kickDir = (transform.position - collision.transform.position).normalized;
            rb.AddTorque(kickDir.x * breachTorque, ForceMode2D.Impulse);

            // Kapı arkasındaki düşmanı bayılt
            CheckDoorKnockdown();
        }
    }

    void CheckDoorKnockdown()
    {
        Collider2D[] enemies = Physics2D.OverlapCircleAll(transform.position, 1.8f, enemyLayer);
        foreach (var enemy in enemies)
        {
            if (enemy.TryGetComponent<IsometricEnemyAI>(out var ai))
            {
                ai.Knockdown();
            }
        }
    }
}`,
  },
  {
    filename: 'IsometricEnemyAI.cs',
    category: 'Düşman Yapay Zekası & Görüş Konisi',
    description: 'Görüş konisi raycasti, silah sesini duyma ve baygınlık durumu yönetimi.',
    code: `using System.Collections;
using UnityEngine;

public class IsometricEnemyAI : MonoBehaviour
{
    [Header("Görüş & Algı")]
    public float viewRadius = 8f;
    [Range(0, 360)] public float viewAngle = 90f;
    public LayerMask targetMask;
    public LayerMask obstacleMask;

    [Header("Durumlar")]
    public bool isKnockedDown = false;
    public float knockdownDuration = 3f;

    private Transform player;
    private Rigidbody2D rb;

    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
        player = GameObject.FindGameObjectWithTag("Player").transform;
    }

    void Update()
    {
        if (isKnockedDown) return;

        // Görüş Konisi Kontrolü
        Vector2 dirToPlayer = (player.position - transform.position).normalized;
        if (Vector2.Distance(transform.position, player.position) < viewRadius)
        {
            if (Vector2.Angle(transform.right, dirToPlayer) < viewAngle / 2f)
            {
                if (!Physics2D.Raycast(transform.position, dirToPlayer, viewRadius, obstacleMask))
                {
                    // Oyuncu görüldü: Ateş et veya hücum et!
                    AttackPlayer(dirToPlayer);
                }
            }
        }
    }

    void AttackPlayer(Vector2 dir)
    {
        float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
        rb.rotation = angle;
        // Ateş etme mantığı...
    }

    public void Knockdown()
    {
        if (isKnockedDown) return;
        isKnockedDown = true;
        StartCoroutine(KnockdownRoutine());
    }

    IEnumerator KnockdownRoutine()
    {
        yield return new WaitForSeconds(knockdownDuration);
        isKnockedDown = false;
    }

    public void ExecuteOnGround()
    {
        // Yerde infaz edilme
        BloodDecalSystem.Instance.SpawnBloodSplatter(transform.position);
        Destroy(gameObject);
    }

    public void TakeLethalHit(Vector2 hitSource)
    {
        Vector2 dir = ((Vector2)transform.position - hitSource).normalized;
        BloodDecalSystem.Instance.SpawnDirectionalBlood(transform.position, dir);
        Destroy(gameObject);
    }
}`,
  },
];

export const UnityIsometricModal: React.FC<UnityIsometricModalProps> = ({ isOpen, onClose }) => {
  const [selectedScript, setSelectedScript] = React.useState<UnityScript>(ISOMETRIC_UNITY_SCRIPTS[0]);
  const [copied, setCopied] = React.useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedScript.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-950/70 border border-indigo-800 rounded-lg text-indigo-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">UNITY 2.5D HOTLINE MIAMI C# BLUEPRINT</h2>
              <p className="text-xs text-slate-400">İzometrik hareket, 360° fare nişanı, kapı tekmeleme, infaz ve silah fırlatma scriptleri.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/40 p-3 flex flex-col gap-2 overflow-y-auto shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">C# Scriptleri:</span>
            {ISOMETRIC_UNITY_SCRIPTS.map((script) => {
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
                Unity 2D/2.5D İpuçları
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                İzometrik kameranın X rotasyonunu 45° veya Orthographic Isometric Tilemap kullanarak 2.5D derinliği elde edebilirsiniz.
              </p>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
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

            <pre className="flex-1 p-4 font-mono text-xs text-slate-200 overflow-auto bg-slate-950/90 leading-relaxed select-text">
              <code>{selectedScript.code}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400 flex items-center justify-between">
          <span>Doğrudan Unity 2022 LTS ve Unity 6 projelerine aktarılabilir C# sınıfları.</span>
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
