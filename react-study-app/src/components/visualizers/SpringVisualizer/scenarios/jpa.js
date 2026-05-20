import { snap } from '@/core/utils/scenarioShared';

function item(value, state = 'idle') { return { value: String(value), state }; }
function baseState(label) {
  return { collectionType: 'spring', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const JPA_SCENARIOS = [
  {
    id: 'jpa-nplus1', label: 'N+1 Problem', icon: '⚠️',
    category: 'jpa', collectionType: 'spring',
    code: [
      '@Entity',
      'public class Author {',
      '    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY)',
      '    private List<Book> books;',
      '}',
      '',
      '// N+1: 1 query for Authors + N queries for each Author.books',
      'List<Author> authors = authorRepo.findAll(); // 1 query',
      'for (Author a : authors) {',
      '    System.out.println(a.getBooks().size());  // N queries!',
      '}',
      '// Total: 1 + 20 = 21 queries for 20 authors',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('N+1 Query Problem — Lazy Loading Cascade');
      s.stages = [
        { op: '1. findAll()', type: 'query', items: [item('SELECT * FROM authors')], active: false },
        { op: '2. Process Author #1', type: 'action', items: [], active: false },
        { op: '3. Access books → LAZY LOAD!', type: 'query', items: [], active: false },
        { op: '4. Process Author #2…', type: 'action', items: [], active: false },
        { op: '5. Access books → LAZY LOAD!', type: 'query', items: [], active: false },
        { op: 'N+1 pattern: 20 authors = 21 queries', type: 'result', items: [], active: false },
      ];
      snap(steps, s, 'N+1: 1 query for parent entities + N additional queries for child collections. Result: 20 authors = 21 SQL queries. Nightmare for performance. Caused by LAZY loading outside transaction (or lazy access in loop).', 0);

      s.stages[0].active = true;
      snap(steps, s, 'authorRepo.findAll() generates: SELECT * FROM authors. Returns 20 Author entities. Hibernate creates proxies for each Author.books (lazy). Proxies are empty — no data fetched yet.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('Loop: author.getBooks()')];
      s.opsLog.push({ msg: 'First access to Author#1.books triggers LAZY LOAD', type: 'warn' });
      snap(steps, s, 'Application iterates authors. Calls author.getBooks(). This triggers Hibernate to load the books collection for first author.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('SELECT * FROM books WHERE author_id = 1')];
      s.opsLog.push({ msg: 'QUERY #2: books for author#1', type: 'warn' });
      snap(steps, s, 'Hibernate executes second SQL: SELECT * FROM books WHERE author_id = 1. Books loaded, persistent bag initialized. First access = query execution.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('Loop: author.getBooks() → LAZY LOAD again!')];
      s.opsLog.push({ msg: 'QUERY #3: books for author#2', type: 'warn' });
      snap(steps, s, 'Second author. books collection is a new proxy → another SQL query. This repeats for EACH author in the loop.', 4);

      s.stages[2].active = false; s.stages[3].active = false;
      s.stages[4].items = [item('QUERY #4: books for author#3'), item('...'), item('QUERY #21: books for author#20')];
      s.opsLog.push({ msg: '... repeats 20 times total!', type: 'error' });
      s.opsLog.push({ msg: 'Total: 1 (authors) + 20 (books) = 21 SQL queries!', type: 'error' });
      snap(steps, s, 'N+1 complete: 1 + 20 = 21 queries. Performance: 21 round trips to DB. With 1000 authors = 1001 queries. Application becomes unresponsive. N+1 is the #1 Hibernate performance killer.', 4);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('Fix: JOIN FETCH a.books'), item('Fix: @EntityGraph(attributePaths="books")'), item('Fix: @BatchSize(size=10)'), item('Fix: findAll with FetchMode.SUBSELECT')];
      s.opsLog.push({ msg: 'FIX: JOIN FETCH = 1 query with LEFT JOIN', type: 'ok' });
      s.opsLog.push({ msg: 'FIX: @BatchSize = batch lazy loads', type: 'ok' });
      s.opsLog.push({ msg: 'FIX: @EntityGraph = declarative fetch plan', type: 'ok' });
      s.result = 'N+1 solved: JOIN FETCH → 1 query instead of 21. @BatchSize → 3 queries instead of 21.';
      snap(steps, s, 'Fixes: 1) JOIN FETCH — JPQL: "SELECT a FROM Author a JOIN FETCH a.books" — 1 query with LEFT JOIN. 2) @EntityGraph(attributePaths="books") — declarative fetch plan. 3) @BatchSize(size=10) — batch lazy loads: 20 authors = 3 queries (10+10). 4) FetchMode.SUBSELECT — 2 queries total.', 5);
      return steps;
    },
  },
  {
    id: 'jpa-fetch', label: 'Fetch Strategies', icon: '📦',
    category: 'jpa', collectionType: 'spring',
    code: [
      '@Entity',
      'public class Order {',
      '    @ManyToOne(fetch = FetchType.EAGER)  // default for @ManyToOne',
      '    private Customer customer;',
      '',
      '    @OneToMany(fetch = FetchType.LAZY)   // default for @OneToMany',
      '    private List<OrderItem> items;',
      '}',
      '',
      '// EAGER = fetch immediately (JOIN or separate SELECT)',
      '// LAZY = proxy, fetch on first access',
      '// LAZY outside transaction → LazyInitializationException!',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Fetch Strategies: LAZY vs EAGER — When to use each');
      s.stages = [
        { op: 'Entity: Order', type: 'entity', items: [], active: false },
        { op: 'Order.customer — EAGER', type: 'fetch', items: [], active: false },
        { op: 'Order.items — LAZY', type: 'fetch', items: [], active: false },
        { op: 'Access items outside TX?', type: 'decision', items: [], active: false },
      ];
      snap(steps, s, 'JPA fetch strategies: EAGER (fetch immediately), LAZY (proxy/delay). Defaults: @ManyToOne=EAGER, @OneToMany=LAZY. Choose: EAGER for small/frequently-accessed. LAZY for large/rarely-accessed. Prefer LAZY + JOIN FETCH for explicit control.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('Order{id=1, total=$49.99}')];
      snap(steps, s, 'Order entity loaded via em.find(Order.class, 1) or repo.findById(1).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('EAGER: customer ALWAYS fetched'), item('→ SELECT o.*, c.* FROM orders o JOIN customers c')];
      s.opsLog.push({ msg: 'EAGER: Hibernate generates JOIN or separate SELECT', type: 'ok' });
      s.opsLog.push({ msg: 'EAGER + multiple @ManyToOne = multiple JOINs = cartesian product!', type: 'warn' });
      snap(steps, s, 'EAGER: Order.customer loaded IMMEDIATELY. Hibernate does: SELECT ... FROM orders LEFT JOIN customers. Customer data available even after EntityManager closes. WARNING: multiple EAGER associations cause JOIN explosion (cartesian product). EAGER is always fetched — even if not needed!', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('LAZY: items = HibernateProxy (empty)'), item('SELECT * FROM orders — NO items join')];
      s.opsLog.push({ msg: 'LAZY: items not fetched. Proxy created instead.', type: 'ok' });
      snap(steps, s, 'LAZY: items collection is a HibernateProxy placeholder. No SQL for items yet. Order loaded efficiently: SELECT * FROM orders WHERE id = 1. Items loaded on FIRST ACCESS only. This is efficient but dangerous outside transaction.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('Inside @Transactional: OK — session still open'), item('Outside TX: LazyInitializationException 💥')];
      s.opsLog.push({ msg: 'Inside TX: items loaded lazily via open Session', type: 'ok' });
      s.opsLog.push({ msg: 'Outside TX: LazyInitializationException — no Session!', type: 'error' });
      snap(steps, s, 'LAZY access behavior depends on transaction: inside @Transactional → Hibernate Session open → loads items (additional SQL). Outside @Transactional → LazyInitializationException: could not initialize proxy - no Session. Fix: @Transactional(readOnly=true), JOIN FETCH, or OpenSessionInView (not recommended for production).', 4);

      s.result = 'LAZY = efficient but needs open Session. EAGER = always loaded but overfetching risk.';
      s.opsLog.push({ msg: 'Best practice: keep everything LAZY, use JOIN FETCH explicitly', type: 'ok' });
      s.opsLog.push({ msg: 'DTO projection: SELECT new OrderDTO(o.id, o.total) FROM Order o', type: 'ok' });
      snap(steps, s, 'Best practice: ALL associations LAZY. Use JOIN FETCH or @EntityGraph for specific use cases. DTO projections (SELECT new OrderDTO(o.id, o.total)) for read-only. Avoid EAGER on toMany — performance unpredictable. Keep LAZY + explicit fetch = predictable queries.', 5);
      return steps;
    },
  },
  {
    id: 'jpa-cascade', label: 'Cascade Types', icon: '📋',
    category: 'jpa', collectionType: 'spring',
    code: [
      '@Entity',
      'public class Order {',
      '    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)',
      '    private List<OrderItem> items = new ArrayList<>();',
      '}',
      '',
      '// CascadeType values: PERSIST, MERGE, REMOVE, REFRESH, DETACH, ALL',
      '// PERSIST: save order → items also saved',
      '// REMOVE: delete order → items also deleted',
      '// ALL = PERSIST + MERGE + REMOVE + REFRESH + DETACH',
      '// orphanRemoval = true: remove orphaned children',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Cascade Types: PERSIST, MERGE, REMOVE, ALL — Operation Propagation');
      s.stages = [
        { op: 'Order entity', type: 'entity', items: [item('Order#1'), item('  Item#1 (new)'), item('  Item#2 (persistent)'), item('  Item#3 (removed from list)')], active: false },
        { op: 'repo.save(order)', type: 'action', items: [], active: false },
        { op: 'Cascade.ALL → cascade PERSIST', type: 'cascade', items: [], active: false },
        { op: 'orphanRemoval → delete orphan', type: 'cascade', items: [], active: false },
      ];
      snap(steps, s, 'Cascade propagates entity operations to associated entities. CascadeType.ALL = PERSIST + MERGE + REMOVE + REFRESH + DETACH. orphanRemoval=true removes children removed from the collection. Parent-side only (mappedBy="order").', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('Order#1 (new)'), item('  Item#1: transient'), item('  Item#2: managed (already in DB)'), item('  Item#3: detached (removed from items list)')];
      snap(steps, s, 'Order created with 3 items. Item#1 = brand new (transient). Item#2 = already persisted (managed). Item#3 was loaded but removed from items collection.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('CascadeType.ALL set on @OneToMany')];
      s.opsLog.push({ msg: 'repo.save(order) called → cascade applies', type: 'ok' });
      snap(steps, s, 'Calling repo.save(order) triggers PERSIST on Order. Because CascadeType.ALL is set (includes PERSIST), the PERSIST cascades to all items in the collection.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('Item#1: INSERT INTO order_item'), item('Item#2: already managed, no INSERT'), item('Item#3: not in collection → orphan?')];
      s.opsLog.push({ msg: 'PERSIST cascaded: Item#1 INSERTED (transient→managed)', type: 'ok' });
      s.opsLog.push({ msg: 'Item#2: already managed, PERSIST has no effect', type: 'ok' });
      snap(steps, s, 'Cascade PERSIST: Item#1 (transient) → INSERT INTO order_item. Item#2 (already managed) → no action (skip — PERSIST only for transient). Item#3 no longer in collection → check orphanRemoval.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('orphanRemoval=true'), item('Item#3 removed from items list → DELETE FROM order_item WHERE id=3')];
      s.opsLog.push({ msg: 'orphanRemoval: Item#3 deleted (orphaned from collection)', type: 'ok' });
      s.opsLog.push({ msg: 'Without orphanRemoval: Item#3 stays in DB but NOT in collection!', type: 'warn' });
      snap(steps, s, 'orphanRemoval=true: Item#3 removed from items list → DELETE SQL. Without orphanRemoval: Item#3 becomes an orphan (exists in DB but not in collection) — DB inconsistency. Use ALL + orphanRemoval for parent-owns-child lifecycle (Order → OrderItems).', 4);

      s.result = 'Cascade.ALL: PERSIST saves children, REMOVE deletes children, orphanRemoval cleans orphans.';
      snap(steps, s, 'Cascade tips: ALL + orphanRemoval on parent side ($owner side). Avoid Cascade.ALL on @ManyToOne (never cascade from child to parent!). REMOVE cascaded = delete order deletes all items. MERGE cascaded = merge(order) merges all items. DETACH cascaded = detach removes items from persistence context too.', 5);
      return steps;
    },
  },
];
